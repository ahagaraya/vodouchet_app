import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";

export function RefreshButton({ onPress, loading }) {
  if (Platform.OS !== "web") return null;
  return (
    <Pressable style={styles.btn} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator size="small" color="#0ea5e9" /> : <Text style={styles.text}>↻ Обновить</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
    marginBottom: 8
  },
  text: { color: "#0369a1", fontWeight: "600", fontSize: 14 }
});
