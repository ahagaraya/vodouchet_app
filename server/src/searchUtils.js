/** Разбор запроса: #7, 7, №7, заказ 7 */
function parseAdminSearchQuery(q) {
  const raw = String(q || "").trim();
  const lower = raw.toLowerCase();
  let orderId = null;

  const idPatterns = [/^#(\d+)$/, /^№(\d+)$/, /^(\d+)$/, /^заказ\s*#?(\d+)$/, /^order\s*#?(\d+)$/];
  for (const re of idPatterns) {
    const m = lower.match(re);
    if (m) {
      orderId = Number(m[1]);
      break;
    }
  }

  const text = lower.replace(/^#+/, "").replace(/№/g, "").trim();
  // Если ввели именно номер заказа — не ищем «7» в датах и телефонах
  const searchByOrderId = orderId !== null;

  return { raw, orderId, text, searchByOrderId };
}

function orderMatchesSearch(order, enrichOrderFn, { orderId, text, searchByOrderId }) {
  if (searchByOrderId && orderId !== null) {
    return Number(order.id) === orderId;
  }
  if (!text) return false;
  const e = enrichOrderFn(order);
  const hay = [
    String(order.id),
    `#${order.id}`,
    order.address,
    order.contact_name,
    order.contact_phone,
    e.client_name,
    e.specialist_name
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(text);
}

module.exports = { parseAdminSearchQuery, orderMatchesSearch };
