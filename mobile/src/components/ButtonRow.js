import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius, space } from "../theme";

/** Горизонтальная группа кнопок — не на всю ширину экрана */
export function ButtonRow({ children, style, centered, stack }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <View style={[styles.row, centered && styles.rowCentered, stack && styles.rowStack, style]}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm
  },
  rowCentered: {
    justifyContent: "center",
    alignSelf: "center",
    width: "100%"
  },
  rowStack: {
    flexDirection: "column",
    alignItems: "stretch",
    maxWidth: 340,
    alignSelf: "center"
  }
});
