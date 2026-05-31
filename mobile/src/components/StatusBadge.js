import React from "react";
import { Text, StyleSheet } from "react-native";
import { ORDER_STATUS_RU, REQUEST_STATUS_RU, normalizeStatus } from "../utils/statusLabels";

const ORDER_STYLES = {
  draft: { bg: "#fef3c7", color: "#a16207" },
  published: { bg: "#dbeafe", color: "#1d4ed8" },
  in_progress: { bg: "#ffedd5", color: "#c2410c" },
  completed: { bg: "#dcfce7", color: "#166534" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c" }
};

const REQUEST_STYLES = {
  new: { bg: "#dbeafe", color: "#1d4ed8" },
  negotiating: { bg: "#fef3c7", color: "#a16207" },
  confirmed: { bg: "#dcfce7", color: "#166534" },
  rejected: { bg: "#fee2e2", color: "#b91c1c" }
};

export function StatusBadge({ status, type = "order" }) {
  const key = normalizeStatus(status);
  const ru = type === "request" ? REQUEST_STATUS_RU : ORDER_STATUS_RU;
  const stylesMap = type === "request" ? REQUEST_STYLES : ORDER_STYLES;
  const s = stylesMap[key] || { bg: "#f1f5f9", color: "#64748b" };
  const label = ru[key] || status || "—";

  return (
    <Text style={[styles.badge, { backgroundColor: s.bg, color: s.color }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden"
  }
});
