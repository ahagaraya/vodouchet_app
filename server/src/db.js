const path = require("path");
const bcrypt = require("bcryptjs");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const dbPath = path.join(__dirname, "..", "data.json");
const db = new Low(new JSONFile(dbPath), {
  users: [],
  categories: [],
  catalogItems: [],
  reviews: [],
  supportMessages: [],
  incomingRequests: [],
  orders: [],
  chatMessages: [],
  auditLog: [],
  pdAccessLog: [],
  complaints: []
});

const FAILURE_REASONS = ["no_access", "defect", "client_absent", "other"];

const ORDER_STATUS_LABELS = {
  draft: "Черновик",
  published: "У специалиста",
  in_progress: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён"
};

function seedOrders() {
  db.data.incomingRequests = [
    {
      id: 1,
      source: "website",
      client_user_id: null,
      client_name: "Петров И.С.",
      client_phone: "+7 (900) 111-22-33",
      address: "ул. Ленина, 12, кв. 45",
      description: "Установка счетчиков ХВС и ГВС",
      visit_date: "2026-05-08",
      visit_time: "18:00",
      estimated_cost: 3200,
      status: "negotiating",
      admin_notes: "Согласовать время после 18:00",
      created_at: "2026-05-01T10:00:00.000Z"
    },
    {
      id: 2,
      source: "telegram",
      client_user_id: null,
      client_name: "Сидорова А.В.",
      client_phone: "+7 (900) 444-55-66",
      address: "пр. Мира, 8",
      description: "Поверка счетчика без снятия",
      visit_date: "",
      visit_time: "",
      estimated_cost: null,
      status: "new",
      admin_notes: "",
      created_at: "2026-05-05T09:30:00.000Z"
    }
  ];

  db.data.orders = [
    {
      id: 1,
      request_id: null,
      client_user_id: null,
      assigned_user_id: 2,
      address: "ул. Гагарина, 5, кв. 12",
      works: [
        { id: 1, title: "Установка счетчика ХВС", completed: false },
        { id: 2, title: "Установка счетчика ГВС", completed: false },
        { id: 3, title: "Оформление акта", completed: false }
      ],
      estimated_cost: 3200,
      contact_name: "Кузнецов В.П.",
      contact_phone: "+7 (900) 777-11-22",
      client_comments: "Домофон не работает, звонить заранее",
      visit_date: "2026-05-06",
      visit_time: "14:00",
      status: "published",
      payment_status: "pending",
      payment_note: "",
      service_note: "",
      created_at: "2026-05-04T12:00:00.000Z",
      updated_at: "2026-05-04T12:00:00.000Z"
    },
    {
      id: 2,
      request_id: null,
      client_user_id: null,
      assigned_user_id: 3,
      address: "ул. Садовая, 22",
      works: [
        { id: 1, title: "Поверка счетчика на месте", completed: false },
        { id: 2, title: "Выдача документов клиенту", completed: false }
      ],
      estimated_cost: 1100,
      contact_name: "Николаева Е.А.",
      contact_phone: "+7 (900) 333-44-55",
      client_comments: "Счетчик в подвале, ключ у concierge",
      visit_date: "2026-05-06",
      visit_time: "10:30",
      status: "published",
      payment_status: "pending",
      payment_note: "",
      service_note: "",
      created_at: "2026-05-03T08:00:00.000Z",
      updated_at: "2026-05-03T08:00:00.000Z"
    },
    {
      id: 3,
      request_id: null,
      client_user_id: 6,
      assigned_user_id: 2,
      address: "ул. Пушкина, 3",
      works: [{ id: 1, title: "Замена узла учета", completed: true }],
      estimated_cost: 3500,
      contact_name: "Орлов Д.М.",
      contact_phone: "+7 (900) 555-66-77",
      client_comments: "",
      visit_date: "2026-05-02",
      visit_time: "16:00",
      status: "completed",
      payment_status: "paid",
      payment_note: "Оплата картой на месте",
      service_note: "Клиент просил повторный выезд через год",
      created_at: "2026-05-01T14:00:00.000Z",
      updated_at: "2026-05-02T17:30:00.000Z"
    }
  ];
}

function seedData() {
  const basePassword = bcrypt.hashSync("Admin1234", 10);
  db.data.users = [
    { id: 1, full_name: "Андрей Админ", email: "admin@vodouchet.ru", login: "admin", password_hash: basePassword, role: "admin", position: "Руководитель", verified: 1, verification_code: null },
    { id: 2, full_name: "Игорь Монтажник", email: "igor@vodouchet.ru", login: "igor_m", password_hash: basePassword, role: "employee", position: "Монтажник", verified: 1, verification_code: null },
    { id: 3, full_name: "Сергей Поверитель", email: "sergey@vodouchet.ru", login: "sergey_p", password_hash: basePassword, role: "employee", position: "Поверитель", verified: 1, verification_code: null },
    { id: 4, full_name: "Ольга Оператор", email: "olga@vodouchet.ru", login: "olga_o", password_hash: basePassword, role: "employee", position: "Оператор", verified: 1, verification_code: null },
    { id: 5, full_name: "Мария Логист", email: "maria@vodouchet.ru", login: "maria_l", password_hash: basePassword, role: "employee", position: "Логист", verified: 1, verification_code: null, phone: "" },
    { id: 6, full_name: "Анна Клиентова", email: "anna@vodouchet.ru", login: "anna_k", password_hash: basePassword, role: "client", position: "Клиент", verified: 1, verification_code: null, phone: "+7 (900) 222-33-44" }
  ];
  db.data.reviews = [
    { id: 1, user_id: 6, order_id: 3, employee_id: 2, rating: 5, comment: "Игорь всё сделал быстро и аккуратно!", created_at: "2026-05-03T10:00:00.000Z" },
    { id: 2, user_id: 6, order_id: null, employee_id: 3, rating: 4, comment: "Хорошая работа, рекомендую.", created_at: "2026-05-04T11:00:00.000Z" }
  ];
  db.data.categories = [
    { id: 1, name: "Счетчики" },
    { id: 2, name: "Монтаж" },
    { id: 3, name: "Поверка" }
  ];
  db.data.catalogItems = [
    { id: 1, title: "Счетчик воды ITELMA", description: "Импульсный, универсальный", price: 2100, image_url: "/static/catalog/item1.png", category_id: 1 },
    { id: 2, title: "Счетчик воды VALTEC", description: "Антимагнитный, сухоходный", price: 2450, image_url: "/static/catalog/item2.png", category_id: 1 },
    { id: 3, title: "Счетчик горячей воды ЭКО", description: "Для ГВС до 90°C", price: 2300, image_url: "/static/catalog/item3.png", category_id: 1 },
    { id: 4, title: "Установка 1 счетчика", description: "Монтаж с подключением", price: 1800, image_url: "/static/catalog/item4.png", category_id: 2 },
    { id: 5, title: "Установка 2 счетчиков", description: "Монтаж комплекта ХВС+ГВС", price: 3200, image_url: "/static/catalog/item5.png", category_id: 2 },
    { id: 6, title: "Замена узла учета", description: "Демонтаж старого/монтаж нового", price: 3500, image_url: "/static/catalog/item6.png", category_id: 2 },
    { id: 7, title: "Поверка без снятия", description: "Поверка на месте", price: 1100, image_url: "/static/catalog/item7.png", category_id: 3 },
    { id: 8, title: "Поверка со снятием", description: "Лабораторная поверка", price: 1600, image_url: "/static/catalog/item8.png", category_id: 3 },
    { id: 9, title: "Оформление документов", description: "Акт, договор, паспорт", price: 700, image_url: "/static/catalog/item9.png", category_id: 3 }
  ];
  seedOrders();
}

async function initDb() {
  await db.read();
  db.data ||= {
    users: [],
    categories: [],
    catalogItems: [],
    reviews: [],
    supportMessages: [],
    incomingRequests: [],
    orders: [],
    chatMessages: [],
    auditLog: [],
    pdAccessLog: [],
    complaints: []
  };
  if (db.data.users.length === 0) {
    seedData();
    await db.write();
    return;
  }
  if (!db.data.orders?.length) {
    seedOrders();
    await db.write();
  }
  await migrateDb();
}

async function migrateDb() {
  let changed = false;
  const basePassword = bcrypt.hashSync("Admin1234", 10);

  if (!db.data.users.find((u) => u.role === "client")) {
    db.data.users.push({
      id: (db.data.users.at(-1)?.id || 0) + 1,
      full_name: "Анна Клиентова",
      email: "anna@vodouchet.ru",
      login: "anna_k",
      password_hash: basePassword,
      role: "client",
      position: "Клиент",
      verified: 1,
      verification_code: null,
      phone: "+7 (900) 222-33-44"
    });
    changed = true;
  }

  (db.data.incomingRequests || []).forEach((r) => {
    if (r.client_user_id === undefined) { r.client_user_id = null; changed = true; }
    if (r.visit_date === undefined) { r.visit_date = ""; changed = true; }
    if (r.visit_time === undefined) { r.visit_time = ""; changed = true; }
    if (r.estimated_cost === undefined) { r.estimated_cost = null; changed = true; }
    if (r.order_id === undefined) { r.order_id = null; changed = true; }
    if (r.preferred_specialist_id === undefined) { r.preferred_specialist_id = null; changed = true; }
  });

  (db.data.incomingRequests || []).forEach((r) => {
    if (!r.order_id) {
      const linked = (db.data.orders || []).find((o) => Number(o.request_id) === Number(r.id));
      if (linked) {
        r.order_id = linked.id;
        changed = true;
      }
    }
  });

  (db.data.orders || []).forEach((o) => {
    if (o.client_user_id === undefined) { o.client_user_id = null; changed = true; }
    if (!o.client_user_id && o.request_id) {
      const req = (db.data.incomingRequests || []).find((r) => r.id === Number(o.request_id));
      if (req?.client_user_id) {
        o.client_user_id = req.client_user_id;
        changed = true;
      }
    }
  });

  (db.data.reviews || []).forEach((r) => {
    if (r.order_id === undefined) { r.order_id = null; changed = true; }
    if (r.employee_id === undefined) { r.employee_id = null; changed = true; }
  });

  if (!db.data.reviews?.length) {
    const client = db.data.users.find((u) => u.login === "anna_k");
    db.data.reviews = [
      { id: 1, user_id: client?.id || 6, order_id: 3, employee_id: 2, rating: 5, comment: "Игорь всё сделал быстро и аккуратно!", created_at: "2026-05-03T10:00:00.000Z" }
    ];
    changed = true;
  }

  const order3 = db.data.orders?.find((o) => o.id === 3);
  const anna = db.data.users.find((u) => u.login === "anna_k");
  if (order3 && anna && !order3.client_user_id) {
    order3.client_user_id = anna.id;
    changed = true;
  }

  if (!db.data.chatMessages) {
    db.data.chatMessages = [];
    changed = true;
  }

  if (!db.data.auditLog) {
    db.data.auditLog = [];
    changed = true;
  }
  if (!db.data.pdAccessLog) {
    db.data.pdAccessLog = [];
    changed = true;
  }
  if (!db.data.complaints) {
    db.data.complaints = [];
    changed = true;
  }

  (db.data.users || []).forEach((u) => {
    if (u.address === undefined) { u.address = ""; changed = true; }
    if (u.deleted === undefined) { u.deleted = false; changed = true; }
    if (u.reset_password_code === undefined) { u.reset_password_code = null; changed = true; }
    if (u.reset_password_expires === undefined) { u.reset_password_expires = null; changed = true; }
  });

  (db.data.incomingRequests || []).forEach((r) => {
    if (r.proposal_cost === undefined) { r.proposal_cost = null; changed = true; }
    if (r.proposal_comment === undefined) { r.proposal_comment = null; changed = true; }
    if (r.proposal_status === undefined) { r.proposal_status = null; changed = true; }
    if (r.reschedule_request === undefined) { r.reschedule_request = null; changed = true; }
    if (r.catalog_items === undefined) { r.catalog_items = []; changed = true; }
  });

  (db.data.orders || []).forEach((o) => {
    if (o.extra_works === undefined) { o.extra_works = []; changed = true; }
    if (o.failure_reason === undefined) { o.failure_reason = null; changed = true; }
    if (o.failure_note === undefined) { o.failure_note = ""; changed = true; }
    if (o.status_history === undefined) {
      o.status_history = [{ status: o.status || "draft", at: o.created_at || new Date().toISOString(), note: "initial" }];
      changed = true;
    }
  });

  (db.data.reviews || []).forEach((r) => {
    if (r.admin_reply === undefined) { r.admin_reply = null; changed = true; }
  });

  if (changed) await db.write();
}

function calculateCatalogCost(catalogItemsInput) {
  const items = [];
  let total = 0;
  for (const entry of catalogItemsInput || []) {
    const catId = Number(entry.catalog_item_id ?? entry.id);
    const cat = db.data.catalogItems.find((c) => c.id === catId);
    if (!cat) continue;
    const qty = Math.max(1, Number(entry.quantity) || 1);
    const subtotal = cat.price * qty;
    total += subtotal;
    items.push({
      catalog_item_id: cat.id,
      title: cat.title,
      price: cat.price,
      quantity: qty,
      subtotal
    });
  }
  return { total, items };
}

function appendOrderStatusHistory(order, status, userId = null, note = null) {
  order.status_history ||= [];
  order.status_history.push({
    status,
    at: new Date().toISOString(),
    by_user_id: userId,
    note
  });
}

function buildOrderTimeline(order) {
  const history = order.status_history || [];
  const statusOrder = ["draft", "published", "in_progress", "completed"];
  const currentIdx = statusOrder.indexOf(order.status);

  const steps = statusOrder.map((status, idx) => {
    const histEntry = history.find((h) => h.status === status);
    const done = order.status === "cancelled" ? status === "draft" && !!histEntry : idx <= currentIdx;
    return {
      status,
      label: ORDER_STATUS_LABELS[status] || status,
      at: histEntry?.at || (idx === 0 ? order.created_at : null),
      done
    };
  });

  if (order.status === "cancelled") {
    const cancelEntry = history.find((h) => h.status === "cancelled");
    steps.push({
      status: "cancelled",
      label: ORDER_STATUS_LABELS.cancelled,
      at: cancelEntry?.at || order.updated_at,
      done: true
    });
  }

  return steps;
}

function enrichRequest(req) {
  const specialist = req.preferred_specialist_id
    ? db.data.users.find((u) => u.id === Number(req.preferred_specialist_id))
    : null;
  const specialistStats = specialist ? employeeRatingStats(specialist.id) : null;
  return {
    ...req,
    preferred_specialist_name: specialist?.full_name || null,
    preferred_specialist_position: specialist?.position || null,
    preferred_specialist_completed_orders: specialistStats?.completed_orders_count ?? null
  };
}

function employeeRatingStats(employeeId) {
  const reviews = (db.data.reviews || []).filter((r) => Number(r.employee_id) === Number(employeeId));
  const orders = (db.data.orders || []).filter((o) => Number(o.assigned_user_id) === Number(employeeId));
  const completed_orders_count = orders.filter((o) => o.status === "completed").length;
  if (!reviews.length) {
    return { rating_avg: null, reviews_count: 0, completed_orders_count };
  }
  const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
  return {
    rating_avg: Math.round((sum / reviews.length) * 10) / 10,
    reviews_count: reviews.length,
    completed_orders_count
  };
}

function reviewsForEmployee(employeeId) {
  return (db.data.reviews || [])
    .filter((r) => Number(r.employee_id) === Number(employeeId))
    .map(enrichReview)
    .sort((a, b) => b.id - a.id);
}

function enrichReview(review) {
  const user = db.data.users.find((u) => u.id === review.user_id);
  const order = review.order_id ? db.data.orders.find((o) => o.id === review.order_id) : null;
  const employee = db.data.users.find((u) => u.id === (review.employee_id || order?.assigned_user_id));
  const adminReplyUser = review.admin_reply?.admin_user_id
    ? db.data.users.find((u) => u.id === review.admin_reply.admin_user_id)
    : null;
  return {
    ...review,
    full_name: user?.full_name || "Клиент",
    client_name: user?.full_name || "Клиент",
    employee_name: employee?.full_name || "",
    order_address: order?.address || "",
    admin_reply: review.admin_reply
      ? { ...review.admin_reply, admin_name: adminReplyUser?.full_name || "Администратор" }
      : null
  };
}

function enrichOrder(order) {
  const specialist = db.data.users.find((u) => u.id === order.assigned_user_id);
  const client = order.client_user_id
    ? db.data.users.find((u) => u.id === Number(order.client_user_id))
    : null;
  return {
    ...order,
    specialist_name: specialist?.full_name || "Не назначен",
    specialist_position: specialist?.position || "",
    client_name: client?.full_name || order.contact_name || "—",
    client_phone: client?.phone || order.contact_phone || "",
    timeline: buildOrderTimeline(order)
  };
}

module.exports = {
  db,
  initDb,
  enrichOrder,
  enrichReview,
  enrichRequest,
  employeeRatingStats,
  reviewsForEmployee,
  buildOrderTimeline,
  calculateCatalogCost,
  appendOrderStatusHistory,
  FAILURE_REASONS
};
