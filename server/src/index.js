require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const { db, initDb, enrichOrder, enrichReview, enrichRequest, employeeRatingStats, reviewsForEmployee, calculateCatalogCost, appendOrderStatusHistory, FAILURE_REASONS } = require("./db");
const { registerChatRoutes } = require("./chatRoutes");
const { registerRoadmapRoutes } = require("./roadmapRoutes");
const { logAudit, logPdAccess } = require("./audit");
const { parseAdminSearchQuery, orderMatchesSearch } = require("./searchUtils");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "vodouchet-secret";

app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "..", "public")));

async function sendCodeEmail(email, code, subject = "Код подтверждения регистрации") {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: Number(process.env.SMTP_PORT || 587),
    auth: {
      user: process.env.SMTP_USER || "test",
      pass: process.env.SMTP_PASS || "test"
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || "noreply@vodouchet.ru",
      to: email,
      subject,
      text: `Ваш код: ${code}`
    });
  } catch (error) {
    console.log("Email service fallback:", error.message);
    console.log(`Code for ${email}: ${code}`);
  }
}

async function sendVerificationEmail(email, code) {
  return sendCodeEmail(email, code, "Код подтверждения регистрации");
}

function auth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Нет токена" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: "Неверный токен" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Только для администратора" });
  }
  return next();
}

function clientOnly(req, res, next) {
  if (req.user.role !== "client") {
    return res.status(403).json({ message: "Только для клиентов" });
  }
  return next();
}

function employeeOnly(req, res, next) {
  if (req.user.role !== "employee") {
    return res.status(403).json({ message: "Только для сотрудников" });
  }
  return next();
}

app.post("/api/auth/register", async (req, res) => {
  const { fullName, email, login, password, position, phone, accountType, acceptedPolicy } = req.body;
  if (!acceptedPolicy) {
    return res.status(400).json({ message: "Необходимо согласие на обработку данных" });
  }
  if (!login || login.length < 4) {
    return res.status(400).json({ message: "Логин минимум 4 символа" });
  }
  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!strongPassword.test(password || "")) {
    return res.status(400).json({ message: "Пароль не соответствует требованиям" });
  }
  if (accountType === "employee") {
    return res.status(403).json({ message: "Регистрация сотрудников только через администратора компании" });
  }
  const existing = db.data.users.find((u) => u.login === login || u.email === email);
  if (existing) return res.status(400).json({ message: "Логин или email уже заняты" });

  const hash = await bcrypt.hash(password, 10);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const id = (db.data.users.at(-1)?.id || 0) + 1;
  const role = "client";
  db.data.users.push({
    id,
    full_name: fullName,
    email,
    login,
    password_hash: hash,
    role,
    position: "Клиент",
    phone: phone || "",
    verified: 0,
    verification_code: code
  });
  await db.write();
  logAudit({ id, role, fullName: fullName }, "auth.register", "user", id, null);

  await sendVerificationEmail(email, code);
  return res.json({ message: "Пользователь создан. Подтвердите email кодом." });
});

app.post("/api/auth/verify", (req, res) => {
  const { email, code } = req.body;
  const user = db.data.users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ message: "Пользователь не найден" });
  if (user.verification_code !== code) {
    return res.status(400).json({ message: "Неверный код" });
  }
  user.verified = 1;
  user.verification_code = null;
  db.write().then(() => res.json({ message: "Email подтвержден" }));
});

app.post("/api/auth/login", async (req, res) => {
  const { login, password } = req.body;
  const user = db.data.users.find((u) => u.login === login);
  if (!user) return res.status(401).json({ message: "Неверные данные" });
  if (user.deleted) return res.status(403).json({ message: "Аккаунт удалён" });
  if (!user.verified) return res.status(403).json({ message: "Подтвердите email" });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Неверные данные" });

  const token = jwt.sign(
    { id: user.id, role: user.role, fullName: user.full_name, position: user.position, email: user.email, phone: user.phone || "", address: user.address || "" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  return res.json({ token });
});

app.get("/api/profile", auth, (req, res) => {
  const user = db.data.users.find((u) => u.id === req.user.id);
  if (!user || user.deleted) return res.status(404).json({ message: "Пользователь не найден" });
  res.json({
    id: user.id,
    role: user.role,
    fullName: user.full_name,
    position: user.position,
    email: user.email,
    phone: user.phone || "",
    address: user.address || "",
    ...(user.role === "employee" ? employeeRatingStats(user.id) : {})
  });
});

app.get("/api/catalog", (req, res) => {
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const categories = [...db.data.categories].sort((a, b) => a.name.localeCompare(b.name));
  const items = db.data.catalogItems
    .filter((i) => (categoryId ? i.category_id === categoryId : true))
    .map((i) => ({
      ...i,
      image_url: i.image_url.startsWith("http") ? i.image_url : `${baseUrl}${i.image_url}`,
      category_name: db.data.categories.find((c) => c.id === i.category_id)?.name || ""
    }));
  res.json({ categories, items });
});

app.get("/api/reviews", (req, res) => {
  const reviews = db.data.reviews.map(enrichReview).sort((a, b) => b.id - a.id);
  res.json(reviews);
});

app.get("/api/specialists", auth, (req, res) => {
  const list = db.data.users
    .filter((u) => u.role === "employee")
    .map(({ id, full_name, position }) => ({
      id,
      full_name,
      position,
      ...employeeRatingStats(id)
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ru"));
  res.json(list);
});

app.get("/api/reviews/mine", auth, employeeOnly, (req, res) => {
  const reviews = db.data.reviews
    .filter((r) => Number(r.employee_id) === Number(req.user.id))
    .map(enrichReview)
    .sort((a, b) => b.id - a.id);
  res.json(reviews);
});

app.post("/api/reviews", auth, clientOnly, (req, res) => {
  const { rating, comment, order_id } = req.body;
  const stars = Number(rating);
  if (!stars || stars < 1 || stars > 5) {
    return res.status(400).json({ message: "Выберите оценку от 1 до 5 звёзд" });
  }
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ message: "Напишите текст отзыва" });
  }

  let employee_id = null;
  if (req.user.role === "client") {
    if (!order_id) return res.status(400).json({ message: "Выберите заказ" });
    const order = db.data.orders.find((o) => o.id === Number(order_id));
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (Number(order.client_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Это не ваш заказ" });
    }
    if (order.status !== "completed") {
      return res.status(400).json({ message: "Отзыв можно оставить только по завершённому заказу" });
    }
    const dup = db.data.reviews.find((r) => r.user_id === req.user.id && r.order_id === order.id);
    if (dup) return res.status(400).json({ message: "Вы уже оставили отзыв по этому заказу" });
    employee_id = order.assigned_user_id;
  }

  const id = (db.data.reviews.at(-1)?.id || 0) + 1;
  db.data.reviews.push({
    id,
    user_id: req.user.id,
    order_id: order_id ? Number(order_id) : null,
    employee_id,
    rating: stars,
    comment: String(comment).trim(),
    created_at: new Date().toISOString()
  });
  db.write().then(() => res.json({ message: "Отзыв добавлен" }));
});

// --- Заказы выезда (специалист видит только опубликованные и назначенные ему) ---

app.get("/api/orders", auth, employeeOnly, (req, res) => {
  let list = db.data.orders || [];
  if (req.user.role === "employee") {
    list = list.filter(
      (o) => Number(o.assigned_user_id) === Number(req.user.id) && ["published", "in_progress", "completed"].includes(o.status)
    );
  }
  res.json(list.map(enrichOrder).sort(compareByRecency));
});

app.get("/api/orders/:id", auth, employeeOnly, (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Заказ не найден" });
  if (req.user.role === "employee") {
    if (Number(order.assigned_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Заказ назначен другому специалисту" });
    }
    if (!["published", "in_progress", "completed"].includes(order.status)) {
      return res.status(403).json({ message: "Заказ ещё не опубликован" });
    }
  }
  res.json(enrichOrder(order));
});

app.patch("/api/orders/:id/report", auth, async (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Заказ не найден" });
  if (req.user.role !== "employee" || Number(order.assigned_user_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: "Нет доступа" });
  }
  const { works, payment_status, payment_note, service_note, status, failure_reason, failure_note } = req.body;
  if (works) order.works = works;
  if (payment_status) order.payment_status = payment_status;
  if (payment_note !== undefined) order.payment_note = payment_note;
  if (service_note !== undefined) order.service_note = service_note;
  if (failure_reason !== undefined) {
    if (failure_reason && !FAILURE_REASONS.includes(failure_reason)) {
      return res.status(400).json({ message: `failure_reason: ${FAILURE_REASONS.join(", ")}` });
    }
    order.failure_reason = failure_reason || null;
  }
  if (failure_note !== undefined) order.failure_note = failure_note;
  const prevStatus = order.status;
  if (status && ["in_progress", "completed"].includes(status) && status !== order.status) {
    order.status = status;
    appendOrderStatusHistory(order, status, req.user.id, failure_reason ? `failure: ${failure_reason}` : null);
  }
  order.updated_at = new Date().toISOString();
  if (order.status === "completed" && prevStatus !== "completed") {
    orderChat.sendOrderReviewRequestMessage(order);
  }
  logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "order.report.updated", "order", order.id, { status: order.status, failure_reason: order.failure_reason });
  await db.write();
  res.json({ message: "Отчёт сохранён", order: enrichOrder(order) });
});

// --- Клиент: заявки и заказы ---

const ORDER_STATUS_RU = {
  draft: "Черновик",
  published: "У специалиста",
  in_progress: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён"
};

const REQUEST_STATUS_RU = {
  new: "Новая",
  negotiating: "Согласование",
  confirmed: "В заказе",
  rejected: "Отклонена"
};

function compareByRecency(a, b) {
  const ta = new Date(a.created_at || a.updated_at || 0).getTime();
  const tb = new Date(b.created_at || b.updated_at || 0).getTime();
  if (tb !== ta) return tb - ta;
  return b.id - a.id;
}

function applyCatalogItemsToRequest(item, catalogItemsInput) {
  if (catalogItemsInput === undefined) return;
  const { total, items } = calculateCatalogCost(catalogItemsInput);
  item.catalog_items = items;
  if (items.length) item.estimated_cost = total;
}

app.get("/api/client/requests", auth, clientOnly, (req, res) => {
  const myOrders = (db.data.orders || []).filter((o) => Number(o.client_user_id) === Number(req.user.id));
  const orderIdByRequest = new Map();
  myOrders.forEach((o) => {
    if (o.request_id) {
      const rid = Number(o.request_id);
      const prev = orderIdByRequest.get(rid);
      if (!prev || o.id > prev) orderIdByRequest.set(rid, o.id);
    }
  });

  const latestOrders = myOrders.filter((o) => {
    if (!o.request_id) return true;
    return orderIdByRequest.get(Number(o.request_id)) === o.id;
  });

  const requests = (db.data.incomingRequests || [])
    .filter((r) => Number(r.client_user_id) === Number(req.user.id))
    .filter((r) => {
      const linked = r.order_id || orderIdByRequest.get(r.id);
      if (r.status === "confirmed" && linked) return false;
      return true;
    })
    .map((r) => ({
      ...enrichRequest(r),
      type: "request",
      status_label: REQUEST_STATUS_RU[r.status] || r.status,
      order_id: r.order_id || orderIdByRequest.get(r.id) || null
    }))
    .sort(compareByRecency);

  const orders = latestOrders
    .map((o) => ({
      ...enrichOrder(o),
      type: "order",
      description: o.client_comments,
      status_label: ORDER_STATUS_RU[o.status] || o.status
    }))
    .sort(compareByRecency);

  res.json([...requests, ...orders].sort(compareByRecency));
});

app.get("/api/client/requests/:id", auth, clientOnly, (req, res) => {
  const item = db.data.incomingRequests.find(
    (r) => r.id === Number(req.params.id) && Number(r.client_user_id) === Number(req.user.id)
  );
  if (!item) return res.status(404).json({ message: "Заявка не найдена" });
  res.json(enrichRequest(item));
});

function resolvePreferredSpecialist(body) {
  const raw = body.preferred_specialist_id;
  if (raw == null || raw === "") return null;
  const sid = Number(raw);
  if (!sid || Number.isNaN(sid)) return { error: "Специалист не найден" };
  const emp = db.data.users.find((u) => u.id === sid && u.role === "employee");
  if (!emp) return { error: "Специалист не найден" };
  return sid;
}

app.post("/api/client/requests", auth, clientOnly, async (req, res) => {
  const { address, description, client_phone, visit_date, visit_time, estimated_cost, catalog_items } = req.body;
  const pref = resolvePreferredSpecialist(req.body);
  if (pref && pref.error) return res.status(400).json({ message: pref.error });
  const addr = String(address || "").trim();
  const desc = String(description || "").trim();
  if (!addr) return res.status(400).json({ message: "Укажите адрес" });
  if (!desc) return res.status(400).json({ message: "Опишите работы" });

  const id = (db.data.incomingRequests.at(-1)?.id || 0) + 1;
  const user = db.data.users.find((u) => u.id === req.user.id);
  const item = {
    id,
    source: "app",
    client_user_id: req.user.id,
    client_name: user?.full_name || "",
    client_phone: client_phone || user?.phone || "",
    address: addr,
    description: desc,
    visit_date: visit_date || "",
    visit_time: visit_time || "",
    estimated_cost: estimated_cost || null,
    catalog_items: [],
    preferred_specialist_id: pref,
    status: "new",
    admin_notes: "",
    proposal_cost: null,
    proposal_comment: null,
    proposal_status: null,
    reschedule_request: null,
    created_at: new Date().toISOString()
  };
  applyCatalogItemsToRequest(item, catalog_items);
  db.data.incomingRequests.push(item);
  logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "request.created", "request", id, null);
  await db.write();
  res.json({ message: "Заявка создана", request: enrichRequest(item) });
});

app.patch("/api/client/requests/:id", auth, clientOnly, async (req, res) => {
  const item = db.data.incomingRequests.find(
    (r) => r.id === Number(req.params.id) && Number(r.client_user_id) === Number(req.user.id)
  );
  if (!item) return res.status(404).json({ message: "Заявка не найдена" });
  if (!["new", "negotiating"].includes(item.status)) {
    return res.status(400).json({ message: "Заявку нельзя изменить после подтверждения. Откройте связанный заказ." });
  }
  if (req.body.preferred_specialist_id !== undefined) {
    const pref = resolvePreferredSpecialist(req.body);
    if (pref && pref.error) return res.status(400).json({ message: pref.error });
    item.preferred_specialist_id = pref;
  }
  ["address", "description", "client_phone", "visit_date", "visit_time", "estimated_cost"].forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  applyCatalogItemsToRequest(item, req.body.catalog_items);
  logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "request.updated", "request", item.id, null);
  await db.write();
  res.json({ message: "Заявка обновлена", request: enrichRequest(item) });
});

app.patch("/api/client/requests/:id/cancel", auth, clientOnly, (req, res) => {
  const item = db.data.incomingRequests.find(
    (r) => r.id === Number(req.params.id) && Number(r.client_user_id) === Number(req.user.id)
  );
  if (!item) return res.status(404).json({ message: "Заявка не найдена" });
  if (!["new", "negotiating"].includes(item.status)) {
    return res.status(400).json({ message: "Заявку нельзя отменить в текущем статусе" });
  }
  item.status = "rejected";
  db.write().then(() => res.json({ message: "Заявка отменена", request: item }));
});

const CLIENT_CANCELLABLE = ["draft", "published"];

app.get("/api/client/orders/:id", auth, clientOnly, (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Заказ не найден" });
  if (Number(order.client_user_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: "Это не ваш заказ" });
  }
  res.json(enrichOrder(order));
});

const CLIENT_EDITABLE = ["draft", "published", "in_progress"];

app.patch("/api/client/orders/:id", auth, clientOnly, (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Заказ не найден" });
  if (Number(order.client_user_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: "Это не ваш заказ" });
  }
  if (!CLIENT_EDITABLE.includes(order.status)) {
    return res.status(400).json({ message: "Заказ нельзя изменить в текущем статусе" });
  }

  const { address, client_comments, contact_phone, visit_date, visit_time, estimated_cost, works } = req.body;
  if (address !== undefined) {
    const addr = String(address).trim();
    if (!addr) return res.status(400).json({ message: "Укажите адрес" });
    order.address = addr;
  }
  if (client_comments !== undefined) order.client_comments = client_comments;
  if (contact_phone !== undefined) order.contact_phone = contact_phone;
  if (visit_date !== undefined) order.visit_date = visit_date;
  if (visit_time !== undefined) order.visit_time = visit_time;
  if (estimated_cost !== undefined) order.estimated_cost = Number(estimated_cost) || 0;
  if (works !== undefined) {
    order.works = (works || []).map((w, i) =>
      typeof w === "string" ? { id: i + 1, title: w, completed: false } : w
    );
  }
  order.updated_at = new Date().toISOString();
  db.write().then(() => res.json({ message: "Заказ обновлён", order: enrichOrder(order) }));
});

app.patch("/api/client/orders/:id/cancel", auth, clientOnly, async (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Заказ не найден" });
  if (Number(order.client_user_id) !== Number(req.user.id)) {
    return res.status(403).json({ message: "Это не ваш заказ" });
  }
  if (order.status === "cancelled") {
    return res.status(400).json({ message: "Заказ уже отменён" });
  }
  if (order.status === "completed") {
    return res.status(400).json({ message: "Нельзя отменить выполненный заказ" });
  }
  if (!CLIENT_CANCELLABLE.includes(order.status)) {
    return res.status(400).json({ message: "Этот заказ нельзя отменить" });
  }
  order.status = "cancelled";
  appendOrderStatusHistory(order, "cancelled", req.user.id, "client cancel");
  order.updated_at = new Date().toISOString();
  if (order.request_id) {
    const reqItem = db.data.incomingRequests.find((r) => r.id === Number(order.request_id));
    if (reqItem) reqItem.status = "rejected";
  }
  logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "order.cancelled", "order", order.id, null);
  await db.write();
  res.json({ message: "Заказ отменён", order: enrichOrder(order) });
});

app.get("/api/client/reviewable-orders", auth, clientOnly, (req, res) => {
  const reviewedIds = new Set(
    db.data.reviews.filter((r) => r.user_id === req.user.id && r.order_id).map((r) => r.order_id)
  );
  const list = (db.data.orders || [])
    .filter(
      (o) =>
        Number(o.client_user_id) === Number(req.user.id) &&
        o.status === "completed" &&
        !reviewedIds.has(o.id)
    )
    .map(enrichOrder);
  res.json(list);
});

// --- Админ: заявки и управление заказами ---

app.get("/api/admin/requests", auth, adminOnly, (req, res) => {
  const list = [...(db.data.incomingRequests || [])]
    .filter((r) => !["confirmed", "rejected"].includes(r.status))
    .map(enrichRequest)
    .sort(compareByRecency);
  res.json(list);
});

app.patch("/api/admin/requests/:id", auth, adminOnly, async (req, res) => {
  const item = db.data.incomingRequests.find((r) => r.id === Number(req.params.id));
  if (!item) return res.status(404).json({ message: "Заявка не найдена" });
  if (item.order_id) {
    return res.status(400).json({ message: "Заявка уже переведена в заказ" });
  }

  const {
    status,
    admin_notes,
    address,
    description,
    client_phone,
    client_name,
    visit_date,
    visit_time,
    estimated_cost,
    catalog_items,
    preferred_specialist_id
  } = req.body;

  if (status) item.status = status;
  if (admin_notes !== undefined) item.admin_notes = admin_notes;
  if (address !== undefined) item.address = String(address).trim();
  if (description !== undefined) item.description = String(description).trim();
  if (client_phone !== undefined) item.client_phone = client_phone || "";
  if (client_name !== undefined) item.client_name = String(client_name).trim();
  if (visit_date !== undefined) item.visit_date = visit_date || "";
  if (visit_time !== undefined) item.visit_time = visit_time || "";

  if (catalog_items !== undefined) {
    applyCatalogItemsToRequest(item, catalog_items);
  } else if (estimated_cost !== undefined) {
    item.estimated_cost = estimated_cost === null || estimated_cost === "" ? null : Number(estimated_cost);
  }

  if (preferred_specialist_id !== undefined) {
    if (preferred_specialist_id === null || preferred_specialist_id === "") {
      item.preferred_specialist_id = null;
    } else {
      const pref = resolvePreferredSpecialist({ preferred_specialist_id });
      if (pref && pref.error) return res.status(400).json({ message: pref.error });
      item.preferred_specialist_id = pref;
    }
  }

  logAudit(
    { id: req.user.id, role: req.user.role, fullName: req.user.fullName },
    "request.updated",
    "request",
    item.id,
    { by: "admin" }
  );
  await db.write();
  res.json({ message: "Заявка обновлена", request: enrichRequest(item) });
});

app.get("/api/admin/orders", auth, adminOnly, (req, res) => {
  const list = (db.data.orders || []).map(enrichOrder).sort(compareByRecency);
  res.json(list);
});

app.get("/api/admin/search", auth, adminOnly, (req, res) => {
  const parsed = parseAdminSearchQuery(req.query.q);
  const { orderId, text, searchByOrderId } = parsed;
  if (orderId === null && !text) {
    return res.json({ orders: [], clients: [] });
  }

  const orders = (db.data.orders || [])
    .filter((o) => orderMatchesSearch(o, enrichOrder, { orderId, text, searchByOrderId }))
    .map(enrichOrder)
    .sort((a, b) => b.id - a.id);

  let clients = db.data.users
    .filter((u) => u.role === "client")
    .filter((u) => {
      if (searchByOrderId && orderId !== null) {
        const hasOrder = (db.data.orders || []).some(
          (o) => o.id === orderId && Number(o.client_user_id) === u.id
        );
        if (hasOrder) return true;
        return false;
      }
      if (!text) return false;
      const hay = [u.full_name, u.login, u.email, u.phone, String(u.id)].join(" ").toLowerCase();
      return hay.includes(text);
    })
    .map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || "",
      login: u.login,
      orders_count: (db.data.orders || []).filter((o) => Number(o.client_user_id) === u.id).length
    }));

  if (orderId !== null) {
    const order = db.data.orders.find((o) => o.id === orderId);
    if (order?.client_user_id) {
      const u = db.data.users.find((x) => x.id === Number(order.client_user_id));
      if (u && !clients.some((c) => c.id === u.id)) {
        clients.push({
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          phone: u.phone || "",
          login: u.login,
          orders_count: (db.data.orders || []).filter((o) => Number(o.client_user_id) === u.id).length
        });
      }
    }
  }

  res.json({ orders, clients });
});

app.get("/api/admin/users", auth, adminOnly, (req, res) => {
  const list = db.data.users
    .filter((u) => u.role !== "admin")
    .map((u) => {
      const base = {
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone || "",
        login: u.login,
        role: u.role,
        position: u.position || "",
        orders_count:
          u.role === "client"
            ? (db.data.orders || []).filter((o) => Number(o.client_user_id) === u.id).length
            : (db.data.orders || []).filter((o) => Number(o.assigned_user_id) === u.id).length,
        requests_count: (db.data.incomingRequests || []).filter((r) => Number(r.client_user_id) === u.id).length
      };
      if (u.role === "employee") {
        const stats = employeeRatingStats(u.id);
        const employeeReviews = reviewsForEmployee(u.id);
        return { ...base, ...stats, last_review: employeeReviews[0] || null };
      }
      return base;
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ru"));
  res.json(list);
});

app.get("/api/admin/users/:id", auth, adminOnly, async (req, res) => {
  const user = db.data.users.find((u) => u.id === Number(req.params.id));
  if (!user || user.role === "admin") {
    return res.status(404).json({ message: "Пользователь не найден" });
  }

  logPdAccess(req.user, user.id, "view_user_profile");
  await db.write();

  const client_orders = (db.data.orders || [])
    .filter((o) => Number(o.client_user_id) === user.id)
    .map(enrichOrder)
    .sort((a, b) => b.id - a.id);

  const employee_orders = (db.data.orders || [])
    .filter((o) => Number(o.assigned_user_id) === user.id)
    .map(enrichOrder)
    .sort((a, b) => b.id - a.id);

  const requests = (db.data.incomingRequests || [])
    .filter((r) => Number(r.client_user_id) === user.id)
    .sort((a, b) => b.id - a.id);

  const payload = {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      login: user.login,
      role: user.role,
      position: user.position || "",
      ...(user.role === "employee" ? employeeRatingStats(user.id) : {})
    },
    client_orders,
    employee_orders,
    requests
  };

  if (user.role === "employee") {
    payload.reviews = reviewsForEmployee(user.id);
  }

  res.json(payload);
});

app.get("/api/admin/clients", auth, adminOnly, (req, res) => {
  const list = db.data.users
    .filter((u) => u.role === "client")
    .map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || "",
      address: u.address || "",
      login: u.login,
      orders_count: (db.data.orders || []).filter((o) => Number(o.client_user_id) === u.id).length
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ru"));
  res.json(list);
});

app.get("/api/admin/clients/:id", auth, adminOnly, (req, res) => {
  const client = db.data.users.find((u) => u.id === Number(req.params.id) && u.role === "client");
  if (!client) return res.status(404).json({ message: "Клиент не найден" });

  const orders = (db.data.orders || [])
    .filter((o) => Number(o.client_user_id) === client.id)
    .map(enrichOrder)
    .sort((a, b) => b.id - a.id);

  const requests = (db.data.incomingRequests || [])
    .filter((r) => Number(r.client_user_id) === client.id)
    .sort((a, b) => b.id - a.id);

  res.json({
    client: {
      id: client.id,
      full_name: client.full_name,
      email: client.email,
      phone: client.phone || "",
      address: client.address || "",
      login: client.login
    },
    orders,
    requests
  });
});

app.get("/api/admin/employees", auth, adminOnly, (req, res) => {
  const employees = db.data.users
    .filter((u) => u.role === "employee")
    .map(({ id, full_name, position }) => ({
      id,
      full_name,
      position,
      ...employeeRatingStats(id)
    }));
  res.json(employees);
});

app.post("/api/admin/orders", auth, adminOnly, async (req, res) => {
  const {
    request_id,
    client_user_id: bodyClientId,
    assigned_user_id,
    address,
    works,
    estimated_cost,
    contact_name,
    contact_phone,
    client_comments,
    visit_date,
    visit_time,
    publish
  } = req.body;
  const addr = String(address ?? "").trim();
  const specId = Number(assigned_user_id);
  if (!addr) {
    return res.status(400).json({ message: "Укажите адрес" });
  }
  if (!specId || Number.isNaN(specId)) {
    return res.status(400).json({ message: "Выберите специалиста" });
  }
  let client_user_id = null;
  if (bodyClientId != null && bodyClientId !== "") {
    const cid = Number(bodyClientId);
    const client = db.data.users.find((u) => u.id === cid && u.role === "client");
    if (!client) {
      return res.status(400).json({ message: "Клиент не найден" });
    }
    client_user_id = cid;
  } else if (request_id) {
    const reqItem = db.data.incomingRequests.find((r) => r.id === Number(request_id));
    if (reqItem) client_user_id = reqItem.client_user_id || null;
  }
  const id = (db.data.orders.at(-1)?.id || 0) + 1;
  const order = {
    id,
    request_id: request_id || null,
    client_user_id,
    assigned_user_id: specId,
    address: addr,
    works: (works || []).map((w, i) =>
      typeof w === "string" ? { id: i + 1, title: w, completed: false } : w
    ),
    estimated_cost: estimated_cost || 0,
    contact_name: contact_name || "",
    contact_phone: contact_phone || "",
    client_comments: client_comments || "",
    visit_date: visit_date || "",
    visit_time: visit_time || "",
    status: publish ? "published" : "draft",
    payment_status: "pending",
    payment_note: "",
    service_note: "",
    extra_works: [],
    failure_reason: null,
    failure_note: "",
    status_history: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  appendOrderStatusHistory(order, order.status, req.user.id, "order created");
  db.data.orders.push(order);
  if (request_id) {
    const reqItem = db.data.incomingRequests.find((r) => r.id === Number(request_id));
    if (reqItem) {
      reqItem.status = "confirmed";
      reqItem.order_id = order.id;
    }
  }
  logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "order.created", "order", order.id, { publish: !!publish });
  await db.write();
  res.json({ message: publish ? "Заказ опубликован специалисту" : "Заказ создан", order: enrichOrder(order) });
});

app.patch("/api/admin/orders/:id", auth, adminOnly, async (req, res) => {
  const order = db.data.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Заказ не найден" });

  const { works, assigned_user_id, client_user_id, ...rest } = req.body;
  const prevStatus = order.status;
  if (assigned_user_id !== undefined) order.assigned_user_id = Number(assigned_user_id);
  if (client_user_id !== undefined) {
    if (client_user_id === null || client_user_id === "") {
      order.client_user_id = null;
    } else {
      const cid = Number(client_user_id);
      const client = db.data.users.find((u) => u.id === cid && u.role === "client");
      if (!client) {
        return res.status(400).json({ message: "Клиент не найден" });
      }
      order.client_user_id = cid;
    }
  }
  if (works !== undefined) {
    order.works = (works || []).map((w, i) =>
      typeof w === "string" ? { id: i + 1, title: w, completed: false } : w
    );
  }
  ["address", "estimated_cost", "contact_name", "contact_phone", "client_comments", "visit_date", "visit_time", "status"].forEach(
    (f) => {
      if (rest[f] !== undefined) order[f] = rest[f];
    }
  );
  if (rest.status && rest.status !== prevStatus) {
    appendOrderStatusHistory(order, rest.status, req.user.id, "admin update");
  }
  order.updated_at = new Date().toISOString();
  if (order.status === "completed" && prevStatus !== "completed") {
    orderChat.sendOrderReviewRequestMessage(order);
  }
  logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "order.updated", "order", order.id, { status: order.status });
  await db.write();
  res.json({ message: "Заказ обновлён", order: enrichOrder(order) });
});

const orderChat = registerChatRoutes(app, { db, auth, adminOnly, enrichOrder });

registerRoadmapRoutes(app, { auth, adminOnly, clientOnly, employeeOnly, sendCodeEmail, JWT_SECRET });

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
});
