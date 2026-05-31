import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { enterToSubmit } from "../utils/enterSubmit";
import { commonStyles } from "../styles/common";
import { colors, space } from "../theme";

export function LoginScreen({ navigation, route }) {
  const [loginValue, setLoginValue] = useState(route.params?.loginHint || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(
    route.params?.verified ? "Email подтверждён. Войдите с логином и паролем, которые указали при регистрации." : ""
  );
  const { login } = useAuth();

  const submit = async () => {
    if (loading) return;
    if (!loginValue.trim() || !password) {
      setError("Введите логин и пароль");
      return;
    }
    try {
      setError("");
      setLoading(true);
      await login(loginValue.trim(), password);
      navigation.navigate("Main");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={commonStyles.screenWhite} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.body}>
        <View style={styles.form}>
          <ScreenHeader title="Вход" subtitle="Доступ к заявкам, выездам и личному кабинету" />
          <FeedbackBanner message={info || error} type={error ? "error" : info ? "success" : "info"} />

          <SectionCard>
            <Text style={commonStyles.fieldLabel}>Логин</Text>
            <TextInput
              style={commonStyles.input}
              value={loginValue}
              onChangeText={setLoginValue}
              placeholder="admin, anna_k, igor_m…"
              autoCapitalize="none"
              autoCorrect={false}
              {...enterToSubmit(submit)}
            />
            <Text style={commonStyles.fieldLabel}>Пароль</Text>
            <TextInput
              style={commonStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              {...enterToSubmit(submit)}
            />
            <Text style={styles.demo}>Демо: admin · igor_m · anna_k — пароль Admin1234</Text>
          </SectionCard>
        </View>
      </View>

      <BottomActions compact>
        <ActionButton title="Войти" loading={loading} onPress={submit} />
        <ActionButton title="Забыли пароль?" variant="secondary" onPress={() => navigation.navigate("ForgotPassword")} />
        <ActionButton title="Регистрация" variant="secondary" onPress={() => navigation.navigate("Register")} />
      </BottomActions>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", padding: space.lg },
  form: { width: "100%", maxWidth: 480, alignSelf: "center" },
  demo: { color: colors.textSubtle, fontSize: 12, marginTop: space.xs, lineHeight: 18 }
});
