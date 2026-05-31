export const ORDER_STATUS_RU = {
  draft: "Черновик",
  published: "У специалиста",
  in_progress: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён"
};

export const REQUEST_STATUS_RU = {
  new: "Новая",
  negotiating: "Согласование",
  confirmed: "В заказе",
  rejected: "Отклонена"
};

export function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase();
}

export function isOrderItem(item) {
  return item.type === "order" || item.specialist_name != null || item.assigned_user_id != null;
}

export function orderCancellable(status) {
  return ["draft", "published"].includes(normalizeStatus(status));
}

export function requestEditable(status) {
  return ["new", "negotiating"].includes(normalizeStatus(status));
}

export function orderEditable(status) {
  return ["draft", "published", "in_progress"].includes(normalizeStatus(status));
}
