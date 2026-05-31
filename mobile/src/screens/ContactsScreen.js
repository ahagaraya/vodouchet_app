import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";

export function ContactsScreen() {
  const latitude = 55.751244;
  const longitude = 37.618423;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Контакты</Text>
      <Text>Тел.: +7 (900) 000-00-00</Text>
      <Text>Email: info@vodouchet.ru</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03
        }}
      >
        <Marker coordinate={{ latitude, longitude }} title="ООО Водоучет" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  map: { flex: 1, marginTop: 12, borderRadius: 10 }
});
