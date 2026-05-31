import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { api } from "../services/api";
import { ActionButton } from "../components/ActionButton";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { enterToSubmit } from "../utils/enterSubmit";

export function VerifyScreen({ route, navigation }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const email = route.params?.email || "";
  const loginHint = route.params?.loginHint || "";

  const submit = async () => {
    try {
      setError("");
      await api.verify({ email, code });
      navigation.navigate("Login", { verified: true, loginHint });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Подтверждение email</Text>
      <Text style={styles.hint}>Код отправлен на {email}. После подтверждения войдите в приложение.</Text>
      <TextInput
        style={styles.input}
        placeholder="Код из письма"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        {...enterToSubmit(submit)}
      />
      <FeedbackBanner message={error} type="error" />
      <ActionButton title="Подтвердить" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  hint: { color: "#64748b", marginBottom: 16, fontSize: 14 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginVertical: 10, fontSize: 16 }
});
