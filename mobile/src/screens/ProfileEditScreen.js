import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { showFeedback } from "../utils/feedback";

export function ProfileEditScreen({ navigation }) {
  const { token, profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await api.updateProfile(token, { phone: phone.trim(), email: email.trim(), address: address.trim() });
      await refreshProfile();
      showFeedback("Сохранено", "Профиль обновлён");
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FeedbackBanner message={error} type={error ? "error" : "info"} />
        <Text style={styles.title}>Редактирование профиля</Text>

        <Text style={styles.label}>Телефон</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+7 (900) 000-00-00" keyboardType="phone-pad" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Адрес</Text>
        <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="ул. Пример, 1" />
      </ScrollView>
      <BottomActions>
        <ActionButton title="Сохранить" loading={loading} onPress={save} />
        <ActionButton title="Отмена" variant="secondary" onPress={() => navigation.goBack()} />
      </BottomActions>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 16 },
  label: { fontWeight: "600", color: "#475569", fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#fff", fontSize: 16 }
});
