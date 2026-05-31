import React, { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet, Platform } from "react-native";
import { registerConfirmHost, resolveConfirm } from "../utils/confirm";
import { colors, radius, shadow, space } from "../theme";

export function ConfirmHost() {
  const [state, setState] = useState({ visible: false, message: "", title: "Подтверждение" });

  useEffect(() => {
    registerConfirmHost(setState);
    return () => registerConfirmHost(null);
  }, []);

  const close = (value) => {
    setState((s) => ({ ...s, visible: false }));
    resolveConfirm(value);
  };

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable style={styles.overlay} onPress={() => close(false)}>
        <Pressable style={styles.box} onPress={(e) => e.stopPropagation?.()}>
          {!!state.title && <Text style={styles.title}>{state.title}</Text>}
          <Text style={styles.message}>{state.message}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnNo]} onPress={() => close(false)}>
              <Text style={styles.btnNoText}>Нет</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnYes]} onPress={() => close(true)}>
              <Text style={styles.btnYesText}>Да</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: space.lg
  },
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    width: "100%",
    maxWidth: 400,
    gap: space.md,
    ...shadow.card
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center"
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: "center"
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.md,
    marginTop: space.sm
  },
  btn: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    alignItems: "center",
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {})
  },
  btnNo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  btnNoText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary
  },
  btnYes: {
    backgroundColor: colors.primary
  },
  btnYesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff"
  }
});
