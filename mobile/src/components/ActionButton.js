import React from "react";
import { View, Pressable, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { colors, radius } from "../theme";

export function ActionButton({
  title,
  onPress,
  color = colors.primary,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  block = false,
  style
}) {
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";

  const pressable = (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        size === "sm" && styles.btnSm,
        !block && styles.btnInline,
        block && styles.btnBlock,
        isGhost ? styles.ghost : isSecondary ? styles.secondary : { backgroundColor: color },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && (Platform.OS === "web" ? styles.pressedWeb : styles.pressed),
        block && style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary || isGhost ? colors.primary : "#fff"} size="small" />
      ) : (
        <Text
          style={[
            styles.text,
            size === "sm" && styles.textSm,
            isSecondary && styles.secondaryText,
            isGhost && styles.ghostText
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );

  if (block) {
    return <View style={[styles.blockWrap, Platform.OS !== "web" && style]}>{pressable}</View>;
  }

  return pressable;
}

const styles = StyleSheet.create({
  blockWrap: {
    width: "100%",
    alignSelf: "stretch",
    ...(Platform.OS === "web" ? { display: "flex", flexDirection: "column", alignItems: "stretch" } : {})
  },
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    ...(Platform.OS === "web" ? { cursor: "pointer", userSelect: "none", boxSizing: "border-box" } : {})
  },
  btnInline: {
    alignSelf: "flex-start"
  },
  btnSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: radius.sm
  },
  btnBlock: {
    width: "100%",
    alignSelf: "stretch",
    ...(Platform.OS === "web" ? { display: "flex", minWidth: "100%" } : {})
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 12
  },
  text: { color: "#fff", fontWeight: "600", fontSize: 15, textAlign: "center" },
  textSm: { fontSize: 13 },
  secondaryText: { color: colors.primaryDark },
  ghostText: { color: colors.textMuted, fontWeight: "500" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  pressedWeb: { opacity: 0.88 }
});
