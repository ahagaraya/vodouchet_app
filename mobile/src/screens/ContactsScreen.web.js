import React from "react";
import { View, Text, StyleSheet, Linking, Pressable } from "react-native";

export function ContactsScreen() {
  const latitude = 55.751244;
  const longitude = 37.618423;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Контакты</Text>
      <Text>Тел.: +7 (900) 000-00-00</Text>
      <Text>Email: info@vodouchet.ru</Text>
      <Pressable
        style={styles.webMap}
        onPress={() => Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`)}
      >
        <Text style={styles.webMapTitle}>Карта офиса (web-режим)</Text>
        <Text>Открыть в Google Maps: {latitude}, {longitude}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  webMap: { marginTop: 12, padding: 14, borderRadius: 10, backgroundColor: "#f1f5f9" },
  webMapTitle: { fontWeight: "700", marginBottom: 6 }
});
