import { Alert, Platform } from "react-native";

/** Только для успешных действий. Ошибки — через FeedbackBanner (alert блокирует UI на web). */
export function showFeedback(title, message) {
  const text = message ? `${title}\n${message}` : title;
  if (Platform.OS === "web") {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
