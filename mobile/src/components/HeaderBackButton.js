import React from "react";
import { Pressable, Text, StyleSheet, Platform } from "react-native";

export function HeaderBackButton({ navigation, tintColor = "#0369a1" }) {
  if (!navigation.canGoBack()) return null;

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      hitSlop={12}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Text style={[styles.arrow, { color: tintColor }]}>←</Text>
      {Platform.OS === "web" && <Text style={[styles.label, { color: tintColor }]}>Назад</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center"
  },
  pressed: { opacity: 0.6 },
  arrow: { fontSize: 26, fontWeight: "700", lineHeight: 28 },
  label: { fontSize: 16, fontWeight: "600", marginLeft: 2 }
});
