import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { api } from "../services/api";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { enterToSubmit } from "../utils/enterSubmit";

export function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) {
      setError("Укажите email");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.forgotPassword({ email: email.trim() });
      setInfo(res.message || "Код отправлен на email");
      setStep("reset");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!code.trim() || !password) {
      setError("Укажите код и новый пароль");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.resetPassword({ email: email.trim(), code: code.trim(), password });
      setInfo("Пароль обновлён. Войдите с новым паролем.");
      navigation.navigate("Login", { loginHint: email.trim() });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>{step === "email" ? "Восстановление пароля" : "Новый пароль"}</Text>
        <FeedbackBanner message={error || info} type={error ? "error" : info ? "success" : "info"} />

        {step === "email" ? (
          <>
            <Text style={styles.hint}>Введите email, указанный при регистрации. Мы отправим код для сброса пароля.</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              {...enterToSubmit(sendCode)}
            />
          </>
        ) : (
          <>
            <Text style={styles.hint}>Email: {email}</Text>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="Код из письма" keyboardType="number-pad" />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Новый пароль (мин. 8 символов, Aa1)"
              secureTextEntry
              {...enterToSubmit(resetPassword)}
            />
          </>
        )}
      </View>
      <BottomActions>
        {step === "email" ? (
          <ActionButton title="Отправить код" loading={loading} onPress={sendCode} />
        ) : (
          <ActionButton title="Сохранить пароль" loading={loading} onPress={resetPassword} />
        )}
        <ActionButton title="Назад" variant="secondary" onPress={() => (step === "reset" ? setStep("email") : navigation.goBack())} />
      </BottomActions>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 16, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 12 },
  hint: { color: "#64748b", fontSize: 14, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 }
});
