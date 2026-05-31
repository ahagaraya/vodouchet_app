import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";

export function StarRating({ value, onChange, size = 32, readonly = false }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={readonly}
          onPress={() => onChange?.(star)}
          style={styles.starBtn}
        >
          <Text style={[styles.star, { fontSize: size }, star <= value ? styles.active : styles.inactive]}>
            {star <= value ? "★" : "☆"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function StarsDisplay({ value, size = 16 }) {
  const stars = "★".repeat(Math.min(5, Math.max(0, value))) + "☆".repeat(5 - Math.min(5, Math.max(0, value)));
  return <Text style={[styles.display, { fontSize: size }]}>{stars}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  starBtn: { padding: 2 },
  star: { lineHeight: 36 },
  active: { color: "#f59e0b" },
  inactive: { color: "#cbd5e1" },
  display: { color: "#f59e0b", letterSpacing: 1 }
});
