import { Platform } from "react-native";

/** Enter в однострочном поле — отправка формы (вход, поиск и т.д.) */
export function enterToSubmit(onSubmit) {
  const submit = () => onSubmit?.();
  return {
    returnKeyType: "done",
    blurOnSubmit: true,
    onSubmitEditing: submit,
    ...(Platform.OS === "web"
      ? {
          onKeyPress: (e) => {
            if (e.nativeEvent?.key === "Enter") submit();
          }
        }
      : {})
  };
}

/** Enter в чате: отправить; Shift+Enter — новая строка (на web) */
export function enterToSendChat(onSend, { multiline = true } = {}) {
  const send = () => onSend?.();
  if (!multiline) return enterToSubmit(send);
  return {
    blurOnSubmit: false,
    ...(Platform.OS === "web"
      ? {
          onKeyPress: (e) => {
            if (e.nativeEvent?.key !== "Enter") return;
            if (e.nativeEvent?.shiftKey) return;
            send();
          }
        }
      : {
          onSubmitEditing: send,
          returnKeyType: "send"
        })
  };
}
