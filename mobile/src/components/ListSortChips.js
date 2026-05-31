import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LIST_SORT_OPTIONS } from "../utils/listSort";
import { colors, radius, space } from "../theme";

export function ListSortChips({ sortBy, onChange, options = LIST_SORT_OPTIONS }) {
  return (
    <View style={styles.sortBlock}>
      <Text style={styles.sortLabel}>Сортировка</Text>
      <View style={styles.sortChips}>
        {options.map((opt) => {
          const active = sortBy === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.sortChip, active && styles.sortChipActive]}
              onPress={() => onChange(opt.id)}
            >
              <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sortBlock: { marginBottom: space.md },
  sortLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: space.sm },
  sortChips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  sortChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  sortChipText: { fontSize: 13, color: colors.textSecondary },
  sortChipTextActive: { color: colors.primaryDark, fontWeight: "700" }
});
