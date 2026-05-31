import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  StyleSheet,
  Platform
} from "react-native";
import { colors, radius, space } from "../theme";

export function SearchablePicker({
  label,
  hint,
  placeholder = "Выберите…",
  searchPlaceholder = "Поиск…",
  value,
  onChange,
  items = [],
  emptyOption,
  getItemId = (item) => String(item.id),
  getItemTitle = (item) => item.full_name || item.title || "",
  getItemSubtitle = (item) => item.subtitle || "",
  filterItem,
  renderItemExtra,
  accent = "blue"
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const accentStyles = accent === "purple" ? accentPurple : accentBlue;

  const allOptions = useMemo(() => {
    const list = [...items];
    if (emptyOption) {
      list.unshift({ ...emptyOption, __empty: true });
    }
    return list;
  }, [items, emptyOption]);

  const selected = useMemo(() => {
    if (!value && emptyOption) return { ...emptyOption, __empty: true };
    return items.find((item) => getItemId(item) === String(value)) || null;
  }, [value, items, emptyOption, getItemId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOptions;
    return allOptions.filter((item) => {
      if (item.__empty) {
        const hay = `${emptyOption.title || ""} ${emptyOption.subtitle || ""}`.toLowerCase();
        return hay.includes(q);
      }
      if (filterItem) return filterItem(item, q);
      const hay = `${getItemTitle(item)} ${getItemSubtitle(item)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allOptions, query, filterItem, getItemTitle, getItemSubtitle, emptyOption]);

  const pick = (item) => {
    if (item.__empty) {
      onChange("");
    } else {
      onChange(getItemId(item), item);
    }
    setQuery("");
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}

      <Pressable
        style={[styles.trigger, accentStyles.trigger, selected && accentStyles.triggerActive]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.triggerBody}>
          {selected ? (
            <>
              <Text style={[styles.triggerTitle, selected && accentStyles.triggerTextActive]}>
                {selected.__empty ? emptyOption.title : getItemTitle(selected)}
              </Text>
              {(selected.__empty ? emptyOption.subtitle : getItemSubtitle(selected)) ? (
                <Text style={[styles.triggerSub, selected && accentStyles.triggerSubActive]}>
                  {selected.__empty ? emptyOption.subtitle : getItemSubtitle(selected)}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.triggerPlaceholder}>{placeholder}</Text>
          )}
        </View>
        <Text style={[styles.chevron, accentStyles.chevron]}>▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || "Выбор"}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            <TextInput
              style={styles.search}
              placeholder={searchPlaceholder}
              value={query}
              onChangeText={setQuery}
              autoFocus={Platform.OS === "web"}
            />

            <FlatList
              style={styles.list}
              data={filtered}
              keyExtractor={(item, idx) => (item.__empty ? "__empty" : getItemId(item)) + idx}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>Ничего не найдено</Text>}
              renderItem={({ item }) => {
                const id = item.__empty ? "" : getItemId(item);
                const active = String(value || "") === String(id || "");
                return (
                  <Pressable
                    style={[styles.option, active && accentStyles.optionActive]}
                    onPress={() => pick(item)}
                  >
                    <View style={styles.optionBody}>
                      <Text style={[styles.optionTitle, active && accentStyles.optionTextActive]}>
                        {item.__empty ? emptyOption.title : getItemTitle(item)}
                      </Text>
                      {(item.__empty ? emptyOption.subtitle : getItemSubtitle(item)) ? (
                        <Text style={[styles.optionSub, active && accentStyles.optionSubActive]}>
                          {item.__empty ? emptyOption.subtitle : getItemSubtitle(item)}
                        </Text>
                      ) : null}
                      {!item.__empty && renderItemExtra ? renderItemExtra(item, active) : null}
                    </View>
                    {active && <Text style={[styles.check, accentStyles.check]}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const accentBlue = {
  trigger: { borderColor: "#e2e8f0" },
  triggerActive: { borderColor: "#0ea5e9", backgroundColor: "#f0f9ff" },
  triggerTextActive: { color: "#0369a1" },
  triggerSubActive: { color: "#0284c7" },
  chevron: { color: "#0ea5e9" },
  optionActive: { backgroundColor: "#e0f2fe", borderColor: "#0ea5e9" },
  optionTextActive: { color: "#0369a1" },
  optionSubActive: { color: "#0284c7" },
  check: { color: "#0ea5e9" }
};

const accentPurple = {
  trigger: { borderColor: "#e2e8f0" },
  triggerActive: { borderColor: "#7c3aed", backgroundColor: "#faf5ff" },
  triggerTextActive: { color: "#5b21b6" },
  triggerSubActive: { color: "#6d28d9" },
  chevron: { color: "#7c3aed" },
  optionActive: { backgroundColor: "#ede9fe", borderColor: "#7c3aed" },
  optionTextActive: { color: "#5b21b6" },
  optionSubActive: { color: "#6d28d9" },
  check: { color: "#7c3aed" }
};

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  label: { fontWeight: "600", marginBottom: 4, marginTop: 4, fontSize: 13, color: colors.textSecondary },
  hint: { color: colors.textSubtle, fontSize: 12, marginBottom: space.sm },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {})
  },
  triggerBody: { flex: 1 },
  triggerTitle: { fontWeight: "700", fontSize: 15, color: colors.text },
  triggerSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  triggerPlaceholder: { fontSize: 15, color: colors.textSubtle },
  chevron: { fontSize: 16, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: space.lg,
    ...(Platform.OS === "web" ? { alignItems: "center" } : {})
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    maxHeight: "80%",
    width: "100%",
    maxWidth: 520,
    overflow: "hidden",
    ...(Platform.OS === "web" ? { boxShadow: "0 16px 48px rgba(15,23,42,0.18)" } : {})
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  closeBtn: { fontSize: 20, color: colors.textMuted, padding: 4 },
  search: {
    margin: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 16,
    backgroundColor: colors.surfaceMuted
  },
  list: { maxHeight: 360 },
  empty: { textAlign: "center", color: colors.textSubtle, padding: space.xxl },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: space.sm
  },
  optionBody: { flex: 1, gap: 2 },
  optionTitle: { fontWeight: "600", fontSize: 15, color: colors.text },
  optionSub: { fontSize: 13, color: colors.textMuted },
  check: { fontSize: 18, fontWeight: "700" }
});
