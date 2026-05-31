import { Platform } from "react-native";

const KEY = "vodouchet_token";

export function saveToken(token) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  }
}

export function loadToken() {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(KEY);
  }
  return null;
}
