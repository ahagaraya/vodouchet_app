// EXPO_PUBLIC_API_URL — см. mobile/.env.example (для APK: IP ПК в Wi‑Fi)
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000/api";

async function request(path, { method = "GET", headers = {}, body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers
      },
      body: body ?? undefined
    });
  } catch {
    throw new Error("Не удалось подключиться к серверу. Запустите backend: cd server && npm start");
  }

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Сервер вернул некорректный ответ. Перезапустите backend (npm start в папке server).");
  }

  if (!res.ok) throw new Error(data.message || "Ошибка запроса");
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  verify: (payload) => request("/auth/verify", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  profile: (token) => request("/profile", { headers: { Authorization: `Bearer ${token}` } }),
  catalog: (categoryId) => request(`/catalog${categoryId ? `?categoryId=${categoryId}` : ""}`),
  reviews: () => request("/reviews"),
  addReview: (token, payload) =>
    request("/reviews", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  orders: (token) => request("/orders", { headers: { Authorization: `Bearer ${token}` } }),
  order: (token, id) => request(`/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  reportOrder: (token, id, payload) =>
    request(`/orders/${id}/report`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminRequests: (token) => request("/admin/requests", { headers: { Authorization: `Bearer ${token}` } }),
  adminOrders: (token) => request("/admin/orders", { headers: { Authorization: `Bearer ${token}` } }),
  adminSearch: (token, q) =>
    request(`/admin/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminClients: (token) => request("/admin/clients", { headers: { Authorization: `Bearer ${token}` } }),
  adminClient: (token, id) => request(`/admin/clients/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminUsers: (token) => request("/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
  adminUser: (token, id) => request(`/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminEmployees: (token) => request("/admin/employees", { headers: { Authorization: `Bearer ${token}` } }),
  createOrder: (token, payload) =>
    request("/admin/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  updateOrder: (token, id, payload) =>
    request(`/admin/orders/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  clientRequests: (token) => request("/client/requests", { headers: { Authorization: `Bearer ${token}` } }),
  clientRequest: (token, id) => request(`/client/requests/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  createClientRequest: (token, payload) =>
    request("/client/requests", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  updateClientRequest: (token, id, payload) =>
    request(`/client/requests/${id}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  cancelClientRequest: (token, id) =>
    request(`/client/requests/${id}/cancel`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }),
  clientOrder: (token, id) => request(`/client/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  updateClientOrder: (token, id, payload) =>
    request(`/client/orders/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  cancelClientOrder: (token, id) =>
    request(`/client/orders/${id}/cancel`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }),
  reviewableOrders: (token) => request("/client/reviewable-orders", { headers: { Authorization: `Bearer ${token}` } }),
  specialists: (token) => request("/specialists", { headers: { Authorization: `Bearer ${token}` } }),
  myReviews: (token) => request("/reviews/mine", { headers: { Authorization: `Bearer ${token}` } }),
  chatGeneral: (token) => request("/chat/general", { headers: { Authorization: `Bearer ${token}` } }),
  chatGeneralSend: (token, text) =>
    request("/chat/general", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ text }) }),
  chatOrder: (token, orderId) => request(`/chat/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } }),
  chatOrderSend: (token, orderId, text) =>
    request(`/chat/orders/${orderId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    }),
  adminChatInbox: (token) => request("/admin/chat/inbox", { headers: { Authorization: `Bearer ${token}` } }),
  adminChatGeneral: (token, userId) => request(`/admin/chat/general/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminChatGeneralSend: (token, userId, text) =>
    request(`/admin/chat/general/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    }),

  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  updateProfile: (token, payload) =>
    request("/profile", { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  deleteProfile: (token) => request("/profile", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),

  clientHistory: (token) => request("/client/history", { headers: { Authorization: `Bearer ${token}` } }),
  respondProposal: (token, requestId, accept) =>
    request(`/client/requests/${requestId}/proposal/respond`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accept })
    }),
  requestReschedule: (token, requestId, payload) =>
    request(`/client/requests/${requestId}/reschedule`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),

  respondExtraWork: (token, orderId, workId, accept) =>
    request(`/client/orders/${orderId}/extra-works/${workId}/respond`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ accept })
    }),
  addExtraWork: (token, orderId, payload) =>
    request(`/orders/${orderId}/extra-works`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),

  adminDashboard: (token) => request("/admin/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
  adminReports: (token, month) =>
    request(`/admin/reports${month ? `?month=${encodeURIComponent(month)}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
  adminAudit: (token) => request("/admin/audit", { headers: { Authorization: `Bearer ${token}` } }),

  adminCatalogItems: (token) => request("/admin/catalog/items", { headers: { Authorization: `Bearer ${token}` } }),
  adminCatalogItemCreate: (token, payload) =>
    request("/admin/catalog/items", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminCatalogItemUpdate: (token, id, payload) =>
    request(`/admin/catalog/items/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminCatalogItemDelete: (token, id) =>
    request(`/admin/catalog/items/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),
  adminCatalogCategories: (token) => request("/admin/catalog/categories", { headers: { Authorization: `Bearer ${token}` } }),
  adminCatalogCategoryCreate: (token, payload) =>
    request("/admin/catalog/categories", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminCatalogCategoryUpdate: (token, id, payload) =>
    request(`/admin/catalog/categories/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminCatalogCategoryDelete: (token, id) =>
    request(`/admin/catalog/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }),

  adminUpdateRequest: (token, requestId, payload) =>
    request(`/admin/requests/${requestId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminSendProposal: (token, requestId, payload) =>
    request(`/admin/requests/${requestId}/proposal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminRescheduleDecision: (token, requestId, approve) =>
    request(`/admin/requests/${requestId}/reschedule`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approve })
    }),

  adminReviewReply: (token, reviewId, reply) =>
    request(`/admin/reviews/${reviewId}/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reply })
    }),
  clientComplaints: (token) => request("/client/complaints", { headers: { Authorization: `Bearer ${token}` } }),
  createComplaint: (token, payload) =>
    request("/client/complaints", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    }),
  adminComplaints: (token) => request("/admin/complaints", { headers: { Authorization: `Bearer ${token}` } }),
  adminComplaintUpdate: (token, id, payload) =>
    request(`/admin/complaints/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
};
