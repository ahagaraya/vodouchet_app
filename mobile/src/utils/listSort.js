import { isOrderItem } from "./statusLabels";

export const LIST_SORT_OPTIONS = [
  { id: "new", label: "Сначала новые" },
  { id: "old", label: "Сначала старые" },
  { id: "status", label: "По активности" },
  { id: "visit", label: "По дате выезда" }
];

const REQUEST_PRIORITY = {
  new: 1,
  negotiating: 2,
  confirmed: 3,
  rejected: 4
};

const ORDER_PRIORITY = {
  in_progress: 1,
  published: 2,
  draft: 3,
  completed: 4,
  cancelled: 5
};

function itemTimestamp(item) {
  return new Date(item.created_at || item.updated_at || 0).getTime();
}

function compareByNewness(a, b) {
  const da = itemTimestamp(a);
  const db = itemTimestamp(b);
  if (db !== da) return db - da;
  return b.id - a.id;
}

function compareByOldness(a, b) {
  const da = itemTimestamp(a);
  const db = itemTimestamp(b);
  if (da !== db) return da - db;
  return a.id - b.id;
}

function visitSortKey(item) {
  const date = item.visit_date;
  if (!date) return Number.MAX_SAFE_INTEGER;
  const time = item.visit_time || "23:59";
  const parsed = new Date(`${date}T${time}`).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function compareByVisit(a, b) {
  const va = visitSortKey(a);
  const vb = visitSortKey(b);
  if (va !== vb) return va - vb;
  return compareByNewness(a, b);
}

function itemStatusPriority(item) {
  if (item.proposal_status === "pending") return 0;
  if (item.reschedule_request?.status === "pending") return 0;
  if (isOrderItem(item) || item.type === "order") {
    return ORDER_PRIORITY[item.status] ?? 9;
  }
  return REQUEST_PRIORITY[item.status] ?? 9;
}

function compareByStatus(a, b) {
  const pa = itemStatusPriority(a);
  const pb = itemStatusPriority(b);
  if (pa !== pb) return pa - pb;
  return compareByNewness(a, b);
}

export function sortListItems(items, sortBy = "new") {
  const list = [...items];
  switch (sortBy) {
    case "old":
      return list.sort(compareByOldness);
    case "status":
      return list.sort(compareByStatus);
    case "visit":
      return list.sort(compareByVisit);
    default:
      return list.sort(compareByNewness);
  }
}

export function sortRequests(items, sortBy = "new") {
  return sortListItems(
    items.map((item) => ({ ...item, type: item.type || "request" })),
    sortBy
  );
}

export function sortOrders(items, sortBy = "new") {
  return sortListItems(
    items.map((item) => ({ ...item, type: "order" })),
    sortBy
  );
}
