import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { catalogSelectionTotal } from "../utils/catalogSelection";

export function CatalogPickerPanel({
  catalogItems,
  selected,
  onToggle,
  onUpdateQty,
  title = "Позиции из каталога",
  hint = "Выберите услуги — сумма подставится в стоимость"
}) {
  if (!catalogItems?.length) return null;

  const total = catalogSelectionTotal(selected);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {catalogItems.map((item) => {
        const sel = selected.find((s) => s.catalog_item_id === item.id);
        return (
          <View key={item.id} style={styles.row}>
            <Pressable style={styles.check} onPress={() => onToggle(item)}>
              <Text style={sel ? styles.checkOn : styles.checkOff}>{sel ? "✓" : "○"}</Text>
              <View style={styles.info}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.price}>{item.price} ₽</Text>
              </View>
            </Pressable>
            {sel && (
              <View style={styles.qtyRow}>
                <Pressable onPress={() => onUpdateQty(item.id, -1)}>
                  <Text style={styles.qtyBtn}>−</Text>
                </Pressable>
                <Text style={styles.qtyVal}>{sel.quantity}</Text>
                <Pressable onPress={() => onUpdateQty(item.id, 1)}>
                  <Text style={styles.qtyBtn}>+</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
      {selected.length > 0 && <Text style={styles.total}>Итого по каталогу: {total} ₽</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4
  },
  title: { fontWeight: "700", fontSize: 15, color: "#0f172a", marginBottom: 2 },
  hint: { color: "#64748b", fontSize: 13, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  check: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
  checkOn: { fontSize: 18, color: "#16a34a", fontWeight: "700", width: 22 },
  checkOff: { fontSize: 18, color: "#94a3b8", width: 22 },
  info: { flex: 1 },
  itemTitle: { fontWeight: "600", color: "#0f172a" },
  price: { color: "#64748b", fontSize: 13, marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { fontSize: 20, fontWeight: "700", color: "#0ea5e9", paddingHorizontal: 8 },
  qtyVal: { fontWeight: "700", minWidth: 20, textAlign: "center" },
  total: { fontWeight: "700", color: "#0f766e", marginTop: 8, fontSize: 15 }
});
