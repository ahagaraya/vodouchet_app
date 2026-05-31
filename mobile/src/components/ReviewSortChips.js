import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SORT_OPTIONS } from "../utils/reviewSort";

export function ReviewSortChips({ sortBy, onChange }) {
  return (
    <View style={styles.sortBlock}>
      <Text style={styles.sortLabel}>Сортировка</Text>
      <View style={styles.sortChips}>
        {SORT_OPTIONS.map((opt) => {
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
  sortBlock: { marginBottom: 12 },
  sortLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  sortChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  sortChipActive: { backgroundColor: "#e0f2fe", borderColor: "#0ea5e9" },
  sortChipText: { fontSize: 13, color: "#475569" },
  sortChipTextActive: { color: "#0369a1", fontWeight: "700" }
});
