import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { api } from "../services/api";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { enterToSubmit } from "../utils/enterSubmit";
import { commonStyles } from "../styles/common";
import { colors, space } from "../theme";

export function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    try {
      setError("");
      await api.register({
        fullName,
        email,
        login,
        password,
        phone,
        accountType: "client",
        acceptedPolicy
      });
      navigation.navigate("Verify", { email, loginHint: login });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <KeyboardAvoidingView style={commonStyles.screenWhite} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <ScreenHeader title="Регистрация" subtitle="Учётные записи сотрудников создаёт администратор компании" />
          <FeedbackBanner message={error} type="error" />

          <SectionCard>
            <Text style={commonStyles.fieldLabel}>ФИО</Text>
            <TextInput style={commonStyles.input} placeholder="Иванов Иван" value={fullName} onChangeText={setFullName} />
            <Text style={commonStyles.fieldLabel}>Email</Text>
            <TextInput style={commonStyles.input} placeholder="email@example.com" value={email} onChangeText={setEmail} autoCapitalize="none" />
            <Text style={commonStyles.fieldLabel}>Логин</Text>
            <TextInput style={commonStyles.input} placeholder="мин. 4 символа" value={login} onChangeText={setLogin} autoCapitalize="none" />
            <Text style={commonStyles.fieldLabel}>Пароль</Text>
            <TextInput style={commonStyles.input} placeholder="мин. 8, Aa1" secureTextEntry value={password} onChangeText={setPassword} />
            <Text style={commonStyles.fieldLabel}>Телефон</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="+7 (900) 000-00-00"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              {...enterToSubmit(submit)}
            />

            <Pressable style={styles.row} onPress={() => setAcceptedPolicy(!acceptedPolicy)}>
              <Text style={styles.policyText}>{acceptedPolicy ? "☑" : "☐"} Согласен на обработку персональных данных</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate("Privacy")}>
              <Text style={styles.link}>Политика конфиденциальности</Text>
            </Pressable>
          </SectionCard>
        </View>
      </ScrollView>
      <BottomActions compact>
        <ActionButton title="Зарегистрироваться" onPress={submit} />
      </BottomActions>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: "center", padding: space.lg },
  form: { width: "100%", maxWidth: 480, alignSelf: "center" },
  row: { marginVertical: space.sm },
  policyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  link: { color: colors.primary, marginTop: space.xs, fontSize: 14 }
});
