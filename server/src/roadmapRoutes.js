const bcrypt = require("bcryptjs");
const {
  db,
  enrichOrder,
  enrichRequest,
  enrichReview,
  buildOrderTimeline,
  calculateCatalogCost,
  appendOrderStatusHistory,
  FAILURE_REASONS
} = require("./db");
const { logAudit, logPdAccess } = require("./audit");

function registerRoadmapRoutes(app, { auth, adminOnly, clientOnly, employeeOnly, sendCodeEmail, JWT_SECRET }) {
  const WEBHOOK_KEY = process.env.WEBHOOK_KEY || "";

  function saveDb() {
    return db.write();
  }

  function adminUser(req) {
    return { id: req.user.id, role: req.user.role, fullName: req.user.fullName };
  }

  function clientUser(req) {
    return { id: req.user.id, role: req.user.role, fullName: req.user.fullName };
  }

  // --- 1. Public website requests ---
  app.post("/api/public/requests", async (req, res) => {
    if (WEBHOOK_KEY) {
      const key = req.headers["x-webhook-key"];
      if (key !== WEBHOOK_KEY) {
        return res.status(401).json({ message: "Неверный ключ webhook" });
      }
    }

    const { client_name, client_phone, address, description, visit_date, visit_time, catalog_items } = req.body;
    const addr = String(address || "").trim();
    const desc = String(description || "").trim();
    const name = String(client_name || "").trim();
    const phone = String(client_phone || "").trim();
    if (!name) return res.status(400).json({ message: "Укажите имя" });
    if (!phone) return res.status(400).json({ message: "Укажите телефон" });
    if (!addr) return res.status(400).json({ message: "Укажите адрес" });
    if (!desc) return res.status(400).json({ message: "Опишите работы" });

    const { total, items } = calculateCatalogCost(catalog_items || []);
    const id = (db.data.incomingRequests.at(-1)?.id || 0) + 1;
    const item = {
      id,
      source: "website",
      client_user_id: null,
      client_name: name,
      client_phone: phone,
      address: addr,
      description: desc,
      visit_date: visit_date || "",
      visit_time: visit_time || "",
      estimated_cost: total || null,
      catalog_items: items,
      preferred_specialist_id: null,
      status: "new",
      admin_notes: "",
      proposal_cost: null,
      proposal_comment: null,
      proposal_status: null,
      reschedule_request: null,
      created_at: new Date().toISOString()
    };
    db.data.incomingRequests.push(item);
    logAudit(null, "request.created.website", "request", id, { source: "website" });
    await saveDb();
    return res.status(201).json({ message: "Заявка принята", request: enrichRequest(item) });
  });

  // --- 2. Admin proposal + client respond ---
  app.post("/api/admin/requests/:id/proposal", auth, adminOnly, async (req, res) => {
    const item = db.data.incomingRequests.find((r) => r.id === Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Заявка не найдена" });
    const { proposal_cost, proposal_comment } = req.body;
    const cost = Number(proposal_cost);
    if (!cost || cost <= 0) return res.status(400).json({ message: "Укажите стоимость предложения" });

    item.proposal_cost = cost;
    item.proposal_comment = String(proposal_comment || "").trim();
    item.proposal_status = "pending";
    item.status = "negotiating";
    logAudit(adminUser(req), "request.proposal.sent", "request", item.id, { proposal_cost: cost });
    await saveDb();
    return res.json({ message: "Предложение отправлено клиенту", request: enrichRequest(item) });
  });

  app.post("/api/client/requests/:id/proposal/respond", auth, clientOnly, async (req, res) => {
    const item = db.data.incomingRequests.find(
      (r) => r.id === Number(req.params.id) && Number(r.client_user_id) === Number(req.user.id)
    );
    if (!item) return res.status(404).json({ message: "Заявка не найдена" });
    if (item.proposal_status !== "pending") {
      return res.status(400).json({ message: "Нет активного предложения для ответа" });
    }

    const { accept } = req.body;
    if (accept === true || accept === "accept") {
      item.proposal_status = "accepted";
      item.estimated_cost = item.proposal_cost;
      item.status = "negotiating";
      logAudit(clientUser(req), "request.proposal.accepted", "request", item.id, null);
    } else if (accept === false || accept === "reject") {
      item.proposal_status = "rejected";
      logAudit(clientUser(req), "request.proposal.rejected", "request", item.id, null);
    } else {
      return res.status(400).json({ message: "Укажите accept: true/false" });
    }
    await saveDb();
    return res.json({ message: "Ответ сохранён", request: enrichRequest(item) });
  });

  // --- 3. Reschedule ---
  app.post("/api/client/requests/:id/reschedule", auth, clientOnly, async (req, res) => {
    const item = db.data.incomingRequests.find(
      (r) => r.id === Number(req.params.id) && Number(r.client_user_id) === Number(req.user.id)
    );
    if (!item) return res.status(404).json({ message: "Заявка не найдена" });
    if (!["new", "negotiating", "confirmed"].includes(item.status)) {
      return res.status(400).json({ message: "Перенос недоступен для этой заявки" });
    }

    const { visit_date, visit_time, comment } = req.body;
    if (!visit_date) return res.status(400).json({ message: "Укажите новую дату" });

    item.reschedule_request = {
      visit_date: String(visit_date),
      visit_time: visit_time || "",
      comment: String(comment || "").trim(),
      status: "pending",
      requested_at: new Date().toISOString()
    };
    logAudit(clientUser(req), "request.reschedule.requested", "request", item.id, item.reschedule_request);
    await saveDb();
    return res.json({ message: "Запрос на перенос отправлен", request: enrichRequest(item) });
  });

  app.patch("/api/admin/requests/:id/reschedule", auth, adminOnly, async (req, res) => {
    const item = db.data.incomingRequests.find((r) => r.id === Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Заявка не найдена" });
    if (!item.reschedule_request || item.reschedule_request.status !== "pending") {
      return res.status(400).json({ message: "Нет ожидающего запроса на перенос" });
    }

    const { approve } = req.body;
    if (approve === true) {
      item.visit_date = item.reschedule_request.visit_date;
      item.visit_time = item.reschedule_request.visit_time;
      item.reschedule_request.status = "approved";
      if (item.order_id) {
        const order = db.data.orders.find((o) => o.id === Number(item.order_id));
        if (order) {
          order.visit_date = item.visit_date;
          order.visit_time = item.visit_time;
          order.updated_at = new Date().toISOString();
        }
      }
      logAudit(adminUser(req), "request.reschedule.approved", "request", item.id, null);
    } else if (approve === false) {
      item.reschedule_request.status = "rejected";
      logAudit(adminUser(req), "request.reschedule.rejected", "request", item.id, null);
    } else {
      return res.status(400).json({ message: "Укажите approve: true/false" });
    }
    await saveDb();
    return res.json({ message: "Решение по переносу сохранено", request: enrichRequest(item) });
  });

  // --- 5. Extra works ---
  app.post("/api/orders/:id/extra-works", auth, employeeOnly, async (req, res) => {
    const order = db.data.orders.find((o) => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (Number(order.assigned_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Нет доступа" });
    }

    const { title, cost, note } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ message: "Укажите описание работ" });
    const workCost = Number(cost);
    if (!workCost || workCost <= 0) return res.status(400).json({ message: "Укажите стоимость" });

    order.extra_works ||= [];
    const workId = (order.extra_works.at(-1)?.id || 0) + 1;
    const work = {
      id: workId,
      title: String(title).trim(),
      cost: workCost,
      note: String(note || "").trim(),
      status: "pending",
      created_at: new Date().toISOString()
    };
    order.extra_works.push(work);
    order.updated_at = new Date().toISOString();
    logAudit({ id: req.user.id, role: req.user.role, fullName: req.user.fullName }, "order.extra_works.added", "order", order.id, work);
    await saveDb();
    return res.json({ message: "Доп. работы добавлены", order: enrichOrder(order) });
  });

  app.post("/api/client/orders/:id/extra-works/:workId/respond", auth, clientOnly, async (req, res) => {
    const order = db.data.orders.find((o) => o.id === Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (Number(order.client_user_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "Это не ваш заказ" });
    }

    const work = (order.extra_works || []).find((w) => w.id === Number(req.params.workId));
    if (!work) return res.status(404).json({ message: "Доп. работа не найдена" });
    if (work.status !== "pending") return res.status(400).json({ message: "Уже обработано" });

    const { accept } = req.body;
    if (accept === true) {
      work.status = "approved";
      order.estimated_cost = (Number(order.estimated_cost) || 0) + work.cost;
      logAudit(clientUser(req), "order.extra_works.approved", "order", order.id, { work_id: work.id });
    } else if (accept === false) {
      work.status = "rejected";
      logAudit(clientUser(req), "order.extra_works.rejected", "order", order.id, { work_id: work.id });
    } else {
      return res.status(400).json({ message: "Укажите accept: true/false" });
    }
    order.updated_at = new Date().toISOString();
    await saveDb();
    return res.json({ message: "Ответ сохранён", order: enrichOrder(order) });
  });

  // --- 7. Forgot / reset password ---
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = db.data.users.find((u) => u.email === email && !u.deleted);
    if (!user) {
      return res.json({ message: "Если email зарегистрирован, код отправлен" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.reset_password_code = code;
    user.reset_password_expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await saveDb();
    await sendCodeEmail(email, code, "Восстановление пароля");
    return res.json({ message: "Если email зарегистрирован, код отправлен" });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, password } = req.body;
    const user = db.data.users.find((u) => u.email === email && !u.deleted);
    if (!user) return res.status(404).json({ message: "Пользователь не найден" });
    if (!user.reset_password_code || user.reset_password_code !== code) {
      return res.status(400).json({ message: "Неверный код" });
    }
    if (user.reset_password_expires && new Date(user.reset_password_expires) < new Date()) {
      return res.status(400).json({ message: "Код истёк" });
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongPassword.test(password || "")) {
      return res.status(400).json({ message: "Пароль не соответствует требованиям" });
    }

    user.password_hash = await bcrypt.hash(password, 10);
    user.reset_password_code = null;
    user.reset_password_expires = null;
    logAudit({ id: user.id, role: user.role, fullName: user.full_name }, "auth.password.reset", "user", user.id, null);
    await saveDb();
    return res.json({ message: "Пароль обновлён" });
  });

  // --- 8. Profile PATCH + DELETE ---
  app.patch("/api/profile", auth, async (req, res) => {
    const user = db.data.users.find((u) => u.id === req.user.id);
    if (!user || user.deleted) return res.status(404).json({ message: "Пользователь не найден" });

    const { phone, email, address } = req.body;
    if (phone !== undefined) user.phone = String(phone).trim();
    if (address !== undefined) user.address = String(address).trim();
    if (email !== undefined) {
      const newEmail = String(email).trim();
      const dup = db.data.users.find((u) => u.email === newEmail && u.id !== user.id);
      if (dup) return res.status(400).json({ message: "Email уже занят" });
      user.email = newEmail;
    }
    logAudit({ id: user.id, role: user.role, fullName: user.full_name }, "profile.updated", "user", user.id, { phone, email, address });
    await saveDb();
    return res.json({
      id: user.id,
      role: user.role,
      fullName: user.full_name,
      position: user.position,
      email: user.email,
      phone: user.phone || "",
      address: user.address || ""
    });
  });

  app.delete("/api/profile", auth, async (req, res) => {
    const user = db.data.users.find((u) => u.id === req.user.id);
    if (!user || user.deleted) return res.status(404).json({ message: "Пользователь не найден" });

    user.deleted = true;
    user.deleted_at = new Date().toISOString();
    user.full_name = "Удалённый пользователь";
    user.email = `deleted_${user.id}@deleted.local`;
    user.login = `deleted_${user.id}`;
    user.phone = "";
    user.address = "";
    user.password_hash = await bcrypt.hash(require("crypto").randomBytes(32).toString("hex"), 10);
    user.verification_code = null;
    user.verified = 0;
    logAudit({ id: user.id, role: user.role, fullName: "deleted" }, "profile.deleted", "user", user.id, null);
    await saveDb();
    return res.json({ message: "Аккаунт удалён" });
  });

  // --- 9. Client history ---
  app.get("/api/client/history", auth, clientOnly, (req, res) => {
    const uid = Number(req.user.id);
    const myOrders = (db.data.orders || []).filter((o) => Number(o.client_user_id) === uid);
    const orderIdByRequest = new Map();
    myOrders.forEach((o) => {
      if (o.request_id) {
        const rid = Number(o.request_id);
        const prev = orderIdByRequest.get(rid);
        if (!prev || o.id > prev) orderIdByRequest.set(rid, o.id);
      }
    });

    const requests = (db.data.incomingRequests || [])
      .filter((r) => Number(r.client_user_id) === uid)
      .map((r) => ({
        ...enrichRequest(r),
        kind: "request",
        date: r.created_at
      }));

    const orders = myOrders.map((o) => ({
      ...enrichOrder(o),
      kind: "order",
      timeline: buildOrderTimeline(o),
      date: o.created_at
    }));

    const documents = myOrders
      .filter((o) => o.status === "completed")
      .flatMap((o) => {
        const docs = [];
        if (o.payment_note) {
          docs.push({
            kind: "document",
            type: "payment",
            order_id: o.id,
            title: "Запись об оплате",
            content: o.payment_note,
            date: o.updated_at || o.created_at
          });
        }
        if (o.service_note) {
          docs.push({
            kind: "document",
            type: "service",
            order_id: o.id,
            title: "Сервисная заметка",
            content: o.service_note,
            date: o.updated_at || o.created_at
          });
        }
        docs.push({
          kind: "document",
          type: "act",
          order_id: o.id,
          title: `Акт по заказу #${o.id}`,
          content: (o.works || []).filter((w) => w.completed).map((w) => w.title).join("; ") || "Работы выполнены",
          date: o.updated_at || o.created_at
        });
        return docs;
      });

    const complaints = (db.data.complaints || [])
      .filter((c) => Number(c.client_user_id) === uid)
      .map((c) => ({ ...c, kind: "complaint", date: c.created_at }));

    const items = [...requests, ...orders, ...documents, ...complaints].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    return res.json(items);
  });

  // --- 10. Admin dashboard ---
  app.get("/api/admin/dashboard", auth, adminOnly, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const newRequests = (db.data.incomingRequests || []).filter((r) => r.status === "new").length;
    const overdueOrders = (db.data.orders || []).filter(
      (o) =>
        o.visit_date &&
        o.visit_date < today &&
        !["completed", "cancelled"].includes(o.status)
    ).length;
    const revenue = (db.data.orders || [])
      .filter((o) => o.status === "completed" && o.payment_status === "paid")
      .reduce((sum, o) => sum + (Number(o.estimated_cost) || 0), 0);

    return res.json({ new_requests: newRequests, overdue_orders: overdueOrders, revenue });
  });

  // --- 11. Admin reports ---
  app.get("/api/admin/reports", auth, adminOnly, (req, res) => {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    if (!y || !m) return res.status(400).json({ message: "Формат month: YYYY-MM" });

    const start = `${month}-01`;
    const endMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

    const ordersInMonth = (db.data.orders || []).filter((o) => {
      const d = (o.visit_date || o.created_at || "").slice(0, 10);
      return d >= start && d < endMonth;
    });

    const visits = ordersInMonth.length;
    const revenue = ordersInMonth
      .filter((o) => o.status === "completed" && o.payment_status === "paid")
      .reduce((sum, o) => sum + (Number(o.estimated_cost) || 0), 0);

    const reviewsInMonth = (db.data.reviews || []).filter((r) => {
      const d = (r.created_at || "").slice(0, 10);
      return d >= start && d < endMonth;
    });
    const ratings =
      reviewsInMonth.length > 0
        ? Math.round((reviewsInMonth.reduce((s, r) => s + Number(r.rating), 0) / reviewsInMonth.length) * 10) / 10
        : null;

    return res.json({
      month,
      visits,
      revenue,
      ratings,
      reviews_count: reviewsInMonth.length,
      completed_orders: ordersInMonth.filter((o) => o.status === "completed").length
    });
  });

  // --- 12. Admin audit ---
  app.get("/api/admin/audit", auth, adminOnly, (req, res) => {
    const entries = [...(db.data.auditLog || [])]
      .sort((a, b) => b.id - a.id)
      .slice(0, 100);
    return res.json(entries);
  });

  // --- 13. Admin catalog CRUD ---
  app.get("/api/admin/catalog/items", auth, adminOnly, (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const items = (db.data.catalogItems || []).map((i) => ({
      ...i,
      image_url: i.image_url?.startsWith("http") ? i.image_url : `${baseUrl}${i.image_url}`,
      category_name: db.data.categories.find((c) => c.id === i.category_id)?.name || ""
    }));
    return res.json(items);
  });

  app.post("/api/admin/catalog/items", auth, adminOnly, async (req, res) => {
    const { title, description, price, image_url, category_id } = req.body;
    if (!title || !category_id) return res.status(400).json({ message: "Укажите название и категорию" });
    const cat = db.data.categories.find((c) => c.id === Number(category_id));
    if (!cat) return res.status(400).json({ message: "Категория не найдена" });

    const id = (db.data.catalogItems.at(-1)?.id || 0) + 1;
    const item = {
      id,
      title: String(title).trim(),
      description: String(description || "").trim(),
      price: Number(price) || 0,
      image_url: image_url || `/static/catalog/item${id}.png`,
      category_id: Number(category_id)
    };
    db.data.catalogItems.push(item);
    logAudit(adminUser(req), "catalog.item.created", "catalog_item", id, null);
    await saveDb();
    return res.status(201).json(item);
  });

  app.patch("/api/admin/catalog/items/:id", auth, adminOnly, async (req, res) => {
    const item = db.data.catalogItems.find((i) => i.id === Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Позиция не найдена" });
    ["title", "description", "price", "image_url", "category_id"].forEach((f) => {
      if (req.body[f] !== undefined) item[f] = f === "category_id" ? Number(req.body[f]) : req.body[f];
    });
    logAudit(adminUser(req), "catalog.item.updated", "catalog_item", item.id, null);
    await saveDb();
    return res.json(item);
  });

  app.delete("/api/admin/catalog/items/:id", auth, adminOnly, async (req, res) => {
    const idx = db.data.catalogItems.findIndex((i) => i.id === Number(req.params.id));
    if (idx === -1) return res.status(404).json({ message: "Позиция не найдена" });
    const removed = db.data.catalogItems.splice(idx, 1)[0];
    logAudit(adminUser(req), "catalog.item.deleted", "catalog_item", removed.id, null);
    await saveDb();
    return res.json({ message: "Удалено" });
  });

  app.get("/api/admin/catalog/categories", auth, adminOnly, (req, res) => {
    return res.json([...db.data.categories].sort((a, b) => a.name.localeCompare(b.name)));
  });

  app.post("/api/admin/catalog/categories", auth, adminOnly, async (req, res) => {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ message: "Укажите название" });
    const id = (db.data.categories.at(-1)?.id || 0) + 1;
    const cat = { id, name: String(name).trim() };
    db.data.categories.push(cat);
    logAudit(adminUser(req), "catalog.category.created", "category", id, null);
    await saveDb();
    return res.status(201).json(cat);
  });

  app.patch("/api/admin/catalog/categories/:id", auth, adminOnly, async (req, res) => {
    const cat = db.data.categories.find((c) => c.id === Number(req.params.id));
    if (!cat) return res.status(404).json({ message: "Категория не найдена" });
    if (req.body.name !== undefined) cat.name = String(req.body.name).trim();
    logAudit(adminUser(req), "catalog.category.updated", "category", cat.id, null);
    await saveDb();
    return res.json(cat);
  });

  app.delete("/api/admin/catalog/categories/:id", auth, adminOnly, async (req, res) => {
    const id = Number(req.params.id);
    const inUse = db.data.catalogItems.some((i) => i.category_id === id);
    if (inUse) return res.status(400).json({ message: "Категория используется в каталоге" });
    const idx = db.data.categories.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ message: "Категория не найдена" });
    db.data.categories.splice(idx, 1);
    logAudit(adminUser(req), "catalog.category.deleted", "category", id, null);
    await saveDb();
    return res.json({ message: "Удалено" });
  });

  // --- 14. Admin review reply ---
  app.post("/api/admin/reviews/:id/reply", auth, adminOnly, async (req, res) => {
    const review = db.data.reviews.find((r) => r.id === Number(req.params.id));
    if (!review) return res.status(404).json({ message: "Отзыв не найден" });
    const { reply } = req.body;
    if (!reply || !String(reply).trim()) return res.status(400).json({ message: "Укажите текст ответа" });

    review.admin_reply = {
      text: String(reply).trim(),
      replied_at: new Date().toISOString(),
      admin_user_id: req.user.id
    };
    logAudit(adminUser(req), "review.replied", "review", review.id, null);
    await saveDb();
    return res.json(enrichReview(review));
  });

  // --- 15. Complaints ---
  app.post("/api/client/complaints", auth, clientOnly, async (req, res) => {
    const { subject, body, order_id, request_id } = req.body;
    if (!subject || !body) return res.status(400).json({ message: "Укажите тему и текст" });

    if (order_id) {
      const order = db.data.orders.find((o) => o.id === Number(order_id));
      if (!order || Number(order.client_user_id) !== Number(req.user.id)) {
        return res.status(403).json({ message: "Заказ не найден" });
      }
    }

    db.data.complaints ||= [];
    const id = (db.data.complaints.at(-1)?.id || 0) + 1;
    const complaint = {
      id,
      client_user_id: req.user.id,
      order_id: order_id ? Number(order_id) : null,
      request_id: request_id ? Number(request_id) : null,
      subject: String(subject).trim(),
      body: String(body).trim(),
      status: "new",
      admin_reply: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.data.complaints.push(complaint);
    logAudit(clientUser(req), "complaint.created", "complaint", id, null);
    await saveDb();
    return res.status(201).json(complaint);
  });

  app.get("/api/client/complaints", auth, clientOnly, (req, res) => {
    const list = (db.data.complaints || [])
      .filter((c) => Number(c.client_user_id) === Number(req.user.id))
      .sort((a, b) => b.id - a.id);
    return res.json(list);
  });

  app.get("/api/admin/complaints", auth, adminOnly, (req, res) => {
    const list = (db.data.complaints || [])
      .map((c) => {
        const client = db.data.users.find((u) => u.id === c.client_user_id);
        return { ...c, client_name: client?.full_name || "" };
      })
      .sort((a, b) => b.id - a.id);
    return res.json(list);
  });

  app.patch("/api/admin/complaints/:id", auth, adminOnly, async (req, res) => {
    const complaint = (db.data.complaints || []).find((c) => c.id === Number(req.params.id));
    if (!complaint) return res.status(404).json({ message: "Претензия не найдена" });

    const { status, admin_reply } = req.body;
    if (status && ["new", "in_progress", "resolved"].includes(status)) complaint.status = status;
    if (admin_reply !== undefined) complaint.admin_reply = String(admin_reply).trim();
    complaint.updated_at = new Date().toISOString();
    logAudit(adminUser(req), "complaint.updated", "complaint", complaint.id, { status, admin_reply });
    await saveDb();
    return res.json(complaint);
  });
}

module.exports = { registerRoadmapRoutes };
