import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { layout, shadow, space } from "../theme";

const STACK_WIDTH = 380;

/**
 * align:
 * - "row" (default) — кнопки в ряд по центру, естественная ширина
 * - "stack" | "center" — столбик одинаковой ширины по центру
 */
export function BottomActions({ children, compact, align = "row" }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const count = items.length;
  const stacked = align === "stack" || align === "center";

  if (stacked) {
    return (
      <View style={styles.bar}>
        <View style={[styles.stack, compact && styles.stackCompact]}>
          {items.map((child, index) => {
            if (!React.isValidElement(child)) return child;
            return (
              <View key={child.key ?? index} style={styles.stackSlot}>
                {React.cloneElement(child, {
                  block: true,
                  size: child.props.size || "md"
                })}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  const single = count === 1;

  return (
    <View style={styles.bar}>
      <View style={[styles.inner, compact && styles.innerCompact, !single && styles.innerRow]}>
        {items.map((child, index) => {
          if (!React.isValidElement(child)) return child;
          return React.cloneElement(child, {
            key: child.key ?? index,
            block: single,
            size: child.props.size || (single ? "md" : "sm")
          });
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: Platform.OS === "web" ? space.lg : space.md,
    zIndex: 20,
    alignItems: "center",
    ...shadow.bar
  },
  inner: {
    width: "100%",
    maxWidth: layout.bottomBarMaxWidth,
    alignItems: "center",
    gap: space.sm
  },
  innerCompact: {
    maxWidth: layout.maxFormWidth
  },
  innerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm
  },
  stack: {
    width: "100%",
    maxWidth: STACK_WIDTH,
    gap: space.sm,
    alignSelf: "center",
    ...(Platform.OS === "web" ? { marginLeft: "auto", marginRight: "auto" } : {})
  },
  stackCompact: {
    maxWidth: layout.maxFormWidth
  },
  stackSlot: {
    width: "100%"
  }
});
