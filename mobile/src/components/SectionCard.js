import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, shadow, space, typography } from "../theme";

const TONES = {
  default: { bg: colors.surface, border: colors.border },
  muted: { bg: colors.surfaceMuted, border: colors.borderLight },
  info: { bg: "#eff6ff", border: "#bfdbfe" },
  success: { bg: colors.successSoft, border: "#bbf7d0" },
  warning: { bg: colors.warningSoft, border: "#fde68a" },
  danger: { bg: colors.dangerSoft, border: "#fecaca" }
};

export function SectionCard({ title, subtitle, children, tone = "default", style }) {
  const toneStyle = TONES[tone] || TONES.default;
  return (
    <View style={[styles.card, { backgroundColor: toneStyle.bg, borderColor: toneStyle.border }, style]}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.sm,
    ...shadow.card
  },
  title: { ...typography.h3, marginBottom: 2 },
  subtitle: { ...typography.caption, marginBottom: space.sm }
});
