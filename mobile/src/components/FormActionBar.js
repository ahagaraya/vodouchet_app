import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { colors, shadow, space } from "../theme";

/** Нижняя панель с кнопками одинаковой ширины, строго по центру (для форм админа и т.п.) */
export function FormActionBar({ children, width = 400 }) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.bar}>
      <View style={[styles.stack, { width, maxWidth: "100%" }]}>
        {items.map((child, index) => {
          if (!React.isValidElement(child)) return null;
          return (
            <View key={child.key ?? index} style={styles.slot}>
              {React.cloneElement(child, { block: true })}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: space.md,
    paddingBottom: Platform.OS === "web" ? space.lg : space.md,
    paddingHorizontal: space.lg,
    zIndex: 20,
    alignItems: "center",
    ...shadow.bar
  },
  stack: {
    gap: space.sm,
    alignSelf: "center",
    ...(Platform.OS === "web"
      ? { marginLeft: "auto", marginRight: "auto", display: "flex", flexDirection: "column", alignItems: "stretch" }
      : {})
  },
  slot: {
    width: "100%",
    alignSelf: "stretch"
  }
});
