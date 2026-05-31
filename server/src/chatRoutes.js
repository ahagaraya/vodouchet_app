function registerChatRoutes(app, { db, auth, adminOnly, enrichOrder }) {
  function getUser(id) {
    return db.data.users.find((u) => u.id === Number(id));
  }

  function nextId() {
    db.data.chatMessages ||= [];
    return (db.data.chatMessages.at(-1)?.id || 0) + 1;
  }

  function enrichMessage(m) {
    return {
      id: m.id,
      channel: m.channel,
      order_id: m.order_id,
      thread_user_id: m.thread_user_id,
      sender_id: m.sender_id,
      sender_role: m.sender_role,
      sender_name: m.sender_name,
      text: m.text,
      action: m.action || null,
      created_at: m.created_at,
      is_mine: false
    };
  }

  function canAccessOrder(order, user) {
    if (!order) return false;
    if (user.role === "admin") return true;
    if (user.role === "client") return Number(order.client_user_id) === Number(user.id);
    if (user.role === "employee") return Number(order.assigned_user_id) === Number(user.id);
    return false;
  }

  function generalMessages(userId) {
    return (db.data.chatMessages || [])
      .filter((m) => m.channel === "general" && Number(m.thread_user_id) === Number(userId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function orderMessages(orderId) {
    return (db.data.chatMessages || [])
      .filter((m) => m.channel === "order" && Number(m.order_id) === Number(orderId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function markThreadRead(channel, { threadUserId, orderId }) {
    (db.data.chatMessages || []).forEach((m) => {
      if (m.channel !== channel) return;
      if (channel === "general" && Number(m.thread_user_id) === Number(threadUserId)) {
        m.read_by_admin = true;
      }
      if (channel === "order" && Number(m.order_id) === Number(orderId)) {
        m.read_by_admin = true;
      }
    });
  }

  function markThreadReadByUser(channel, { threadUserId, orderId }) {
    (db.data.chatMessages || []).forEach((m) => {
      if (m.channel !== channel) return;
      if (channel === "general" && Number(m.thread_user_id) === Number(threadUserId)) {
        if (m.sender_role === "admin") m.read_by_user = true;
      }
      if (channel === "order" && Number(m.order_id) === Number(orderId)) {
        if (m.sender_role === "admin") m.read_by_user = true;
      }
    });
  }

  function generalUnreadForUser(userId) {
    return (db.data.chatMessages || []).filter(
      (m) =>
        m.channel === "general" &&
        Number(m.thread_user_id) === Number(userId) &&
        m.sender_role === "admin" &&
        m.read_by_user === false
    ).length;
  }

  function pushMessage({ channel, threadUserId, orderId, user, text, action }) {
    const isAdmin = user.role === "admin";
    const msg = {
      id: nextId(),
      channel,
      thread_user_id: channel === "general" ? threadUserId : null,
      order_id: channel === "order" ? orderId : null,
      sender_id: user.id,
      sender_role: user.role,
      sender_name: user.full_name || user.login,
      text: String(text).trim(),
      action: action || null,
      created_at: new Date().toISOString(),
      read_by_admin: isAdmin,
      read_by_user: !isAdmin
    };
    db.data.chatMessages.push(msg);
    return msg;
  }

  function getAdminUser() {
    return db.data.users.find((u) => u.role === "admin");
  }

  function hasReviewRequestMessage(orderId) {
    return (db.data.chatMessages || []).some(
      (m) => m.channel === "order" && Number(m.order_id) === Number(orderId) && m.action?.type === "review"
    );
  }

  function sendOrderReviewRequestMessage(order) {
    if (!order?.client_user_id || order.status !== "completed") return false;
    if (hasReviewRequestMessage(order.id)) return false;
    const alreadyReviewed = (db.data.reviews || []).some(
      (r) => Number(r.order_id) === Number(order.id) && Number(r.user_id) === Number(order.client_user_id)
    );
    if (alreadyReviewed) return false;

    const admin = getAdminUser();
    if (!admin) return false;

    const enriched = enrichOrder(order);
    const specialistName = enriched.specialist_name || "специалиста";
    pushMessage({
      channel: "order",
      orderId: order.id,
      user: admin,
      text: `Работы по заказу #${order.id} завершены. Пожалуйста, оцените работу ${specialistName}.`,
      action: {
        type: "review",
        order_id: order.id,
        label: `Оставить отзыв по заказу #${order.id}`
      }
    });
    return true;
  }

  function mapForViewer(messages, viewerId) {
    return messages.map((m) => ({
      ...enrichMessage(m),
      is_mine: Number(m.sender_id) === Number(viewerId)
    }));
  }

  // --- Общий чат с администратором (клиент / сотрудник) ---
  app.get("/api/chat/general", auth, (req, res) => {
    if (req.user.role === "admin") {
      return res.status(400).json({ message: "Используйте раздел «Чаты» в админ-панели" });
    }
    const unread = generalUnreadForUser(req.user.id);
    markThreadReadByUser("general", { threadUserId: req.user.id });
    db.write().then(() => {
      const list = mapForViewer(generalMessages(req.user.id), req.user.id);
      res.json({ messages: list, unread_count: unread });
    });
  });

  app.post("/api/chat/general", auth, (req, res) => {
    if (req.user.role === "admin") {
      return res.status(400).json({ message: "Выберите диалог в разделе «Чаты»" });
    }
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Введите сообщение" });
    const user = getUser(req.user.id);
    const msg = pushMessage({
      channel: "general",
      threadUserId: req.user.id,
      user,
      text
    });
    db.write().then(() => res.json({ message: "Отправлено", chatMessage: { ...msg, is_mine: true } }));
  });

  // --- Чат по заказу ---
  app.get("/api/chat/orders/:orderId", auth, async (req, res) => {
    const order = db.data.orders.find((o) => o.id === Number(req.params.orderId));
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (!canAccessOrder(order, req.user)) {
      return res.status(403).json({ message: "Нет доступа к чату заказа" });
    }
    if (order.status === "completed") {
      const sent = sendOrderReviewRequestMessage(order);
      if (sent) await db.write();
    }
    if (req.user.role === "admin") {
      markThreadRead("order", { orderId: order.id });
    } else {
      markThreadReadByUser("order", { orderId: order.id });
    }
    const list = mapForViewer(orderMessages(order.id), req.user.id);
    res.json({ messages: list, order: enrichOrder(order) });
  });

  app.post("/api/chat/orders/:orderId", auth, (req, res) => {
    const order = db.data.orders.find((o) => o.id === Number(req.params.orderId));
    if (!order) return res.status(404).json({ message: "Заказ не найден" });
    if (!canAccessOrder(order, req.user)) {
      return res.status(403).json({ message: "Нет доступа к чату заказа" });
    }
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Введите сообщение" });
    const user = getUser(req.user.id);
    const msg = pushMessage({
      channel: "order",
      orderId: order.id,
      user,
      text
    });
    db.write().then(() => res.json({ message: "Отправлено", chatMessage: { ...msg, is_mine: true } }));
  });

  // --- Админ: inbox ---
  app.get("/api/admin/chat/inbox", auth, adminOnly, (req, res) => {
    const msgs = db.data.chatMessages || [];
    const generalMap = new Map();
    const orderMap = new Map();

    msgs.forEach((m) => {
      if (m.channel === "general") {
        const uid = Number(m.thread_user_id);
        if (!generalMap.has(uid)) {
          const u = getUser(uid);
          generalMap.set(uid, {
            type: "general",
            user_id: uid,
            user_name: u?.full_name || "Пользователь",
            user_role: u?.role || "—",
            last_message: m.text,
            last_at: m.created_at,
            unread_count: 0
          });
        }
        const row = generalMap.get(uid);
        if (new Date(m.created_at) >= new Date(row.last_at)) {
          row.last_message = m.text;
          row.last_at = m.created_at;
        }
        if (!m.read_by_admin && m.sender_role !== "admin") row.unread_count += 1;
      }
      if (m.channel === "order") {
        const oid = Number(m.order_id);
        if (!orderMap.has(oid)) {
          const order = db.data.orders.find((o) => o.id === oid);
          const enriched = order ? enrichOrder(order) : null;
          const client = order?.client_user_id ? getUser(order.client_user_id) : null;
          orderMap.set(oid, {
            type: "order",
            order_id: oid,
            address: order?.address || "—",
            client_name: client?.full_name || order?.contact_name || "—",
            specialist_name: enriched?.specialist_name || "—",
            order_status: order?.status,
            last_message: m.text,
            last_at: m.created_at,
            unread_count: 0
          });
        }
        const row = orderMap.get(oid);
        if (new Date(m.created_at) >= new Date(row.last_at)) {
          row.last_message = m.text;
          row.last_at = m.created_at;
        }
        if (!m.read_by_admin && m.sender_role !== "admin") row.unread_count += 1;
      }
    });

    const general = [...generalMap.values()].sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
    const orders = [...orderMap.values()].sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
    res.json({ general, orders, unread_total: general.reduce((s, x) => s + x.unread_count, 0) + orders.reduce((s, x) => s + x.unread_count, 0) });
  });

  app.get("/api/admin/chat/general/:userId", auth, adminOnly, (req, res) => {
    const userId = Number(req.params.userId);
    const u = getUser(userId);
    if (!u) return res.status(404).json({ message: "Пользователь не найден" });
    markThreadRead("general", { threadUserId: userId });
    db.write().then(() => {
      const list = mapForViewer(generalMessages(userId), req.user.id);
      res.json({ messages: list, user: { id: u.id, full_name: u.full_name, role: u.role } });
    });
  });

  app.post("/api/admin/chat/general/:userId", auth, adminOnly, (req, res) => {
    const userId = Number(req.params.userId);
    const u = getUser(userId);
    if (!u) return res.status(404).json({ message: "Пользователь не найден" });
    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Введите сообщение" });
    const admin = getUser(req.user.id);
    const msg = pushMessage({ channel: "general", threadUserId: userId, user: admin, text });
    db.write().then(() => res.json({ message: "Отправлено", chatMessage: { ...msg, is_mine: true } }));
  });

  return { sendOrderReviewRequestMessage };
}

module.exports = { registerChatRoutes };
