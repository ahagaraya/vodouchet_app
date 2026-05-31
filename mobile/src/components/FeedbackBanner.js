import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, space } from "../theme";

const TYPES = {
  error: { bg: colors.dangerSoft, border: "#fecaca", color: colors.danger },
  success: { bg: colors.successSoft, border: "#bbf7d0", color: "#166534" },
  info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" }
};

export function FeedbackBanner({ message, type = "info" }) {
  if (!message) return null;
  const t = TYPES[type] || TYPES.info;
  return (
    <View style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.text, { color: t.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: space.md,
    borderRadius: radius.md,
    marginBottom: space.md,
    borderWidth: 1
  },
  text: { fontSize: 14, fontWeight: "600", lineHeight: 20 }
});
