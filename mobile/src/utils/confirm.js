import { Alert, Platform } from "react-native";

let hostSetState = null;
let pending = null;

export function registerConfirmHost(setState) {
  hostSetState = setState;
}

export function resolveConfirm(value) {
  if (pending) {
    pending.resolve(value);
    pending = null;
  }
}

/** Подтверждение действия — кнопки «Да» / «Нет» (не «OK» / «Отменить») */
export function confirmAction(message, title = "") {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      pending = { resolve };
      hostSetState?.({
        visible: true,
        message,
        title
      });
      return;
    }
    Alert.alert(title || "Подтверждение", message, [
      { text: "Нет", style: "cancel", onPress: () => resolve(false) },
      { text: "Да", onPress: () => resolve(true) }
    ]);
  });
}
