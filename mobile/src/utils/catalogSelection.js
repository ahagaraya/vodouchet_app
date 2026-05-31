export function catalogSelectionTotal(selected) {
  return (selected || []).reduce((sum, s) => sum + Number(s.price) * Number(s.quantity || 1), 0);
}

export function catalogSelectionToWorks(selected) {
  return (selected || [])
    .map((c) => (Number(c.quantity) > 1 ? `${c.title} × ${c.quantity}` : c.title))
    .join("\n");
}

export function catalogItemsToSelection(items) {
  return (items || []).map((c) => ({
    catalog_item_id: c.catalog_item_id,
    title: c.title,
    price: c.price,
    quantity: c.quantity || 1
  }));
}

export function selectionToApiPayload(selected) {
  return (selected || []).map((s) => ({
    catalog_item_id: s.catalog_item_id,
    quantity: s.quantity || 1
  }));
}
