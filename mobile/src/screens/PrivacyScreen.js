import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";

export function PrivacyScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Политика конфиденциальности</Text>
      <Text style={styles.text}>
        ООО "Водоучет" обрабатывает персональные данные пользователей только для целей оказания услуг,
        обратной связи и выполнения договорных обязательств. Согласие можно отозвать письменным заявлением.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  text: { fontSize: 16, lineHeight: 22 }
});
