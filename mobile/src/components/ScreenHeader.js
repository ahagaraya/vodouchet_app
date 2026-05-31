import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, space, typography } from "../theme";

export function ScreenHeader({ title, subtitle, right, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.md,
    marginBottom: space.lg
  },
  textCol: { flex: 1, gap: 4 },
  title: typography.h1,
  subtitle: typography.caption,
  right: { flexShrink: 0 }
});
