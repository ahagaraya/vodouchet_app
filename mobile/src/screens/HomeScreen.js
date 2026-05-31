import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSupportChat } from "../context/SupportChatContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { commonStyles } from "../styles/common";
import { colors, space } from "../theme";

export function HomeScreen({ navigation }) {
  const { profile, token } = useAuth();
  const { openChat } = useSupportChat();

  const subtitle =
    profile?.role === "client"
      ? "Личный кабинет клиента"
      : profile?.role === "admin"
        ? "Панель администратора"
        : profile?.role === "employee"
          ? "Приложение для выездных специалистов"
          : "Мобильное приложение ООО «Водоучет»";

  return (
    <View style={commonStyles.screen}>
      <ScrollView style={commonStyles.scroll} contentContainerStyle={commonStyles.content}>
        <ScreenHeader title="ООО «Водоучет»" subtitle={subtitle} />

        <SectionCard title="Как это работает">
          <Text style={styles.step}>1. Клиент оставляет заявку (сайт / Telegram)</Text>
          <Text style={styles.step}>2. Администратор согласует дату, работы и стоимость</Text>
          <Text style={styles.step}>3. После подтверждения заказ появляется у специалиста</Text>
          <Text style={styles.step}>4. Мастер выполняет работы и отмечает статус на объекте</Text>
        </SectionCard>

        {!profile && (
          <SectionCard tone="muted" subtitle="Войдите или зарегистрируйтесь как клиент или сотрудник" />
        )}

        {profile?.role === "client" && (
          <SectionCard tone="info" subtitle="Оформите заявку во вкладке «Мои заявки» — администратор согласует выезд" />
        )}

        {profile?.role === "employee" && (
          <SectionCard tone="info" subtitle="Ваши назначенные выезды — во вкладке «Выезды»" />
        )}

        {profile?.role === "admin" && (
          <SectionCard
            tone="info"
            subtitle="Управление — во вкладке «Админ»; справочник цен на услуги — в «Каталог»."
          />
        )}
      </ScrollView>

      <BottomActions>
        {!profile && (
          <>
            <ActionButton title="Войти" onPress={() => navigation.navigate("Login")} />
            <ActionButton title="Регистрация" variant="secondary" onPress={() => navigation.navigate("Register")} />
          </>
        )}
        {profile?.role === "client" && (
          <ActionButton title="Мои заявки" onPress={() => navigation.navigate("Мои заявки")} />
        )}
        {profile?.role === "employee" && (
          <ActionButton title="Мои выезды" onPress={() => navigation.navigate("Выезды")} />
        )}
        {profile?.role === "admin" && (
          <ActionButton title="Заявки и заказы" onPress={() => navigation.navigate("Админ")} />
        )}
        {profile?.role !== "admin" && (
          <ActionButton
            title="Онлайн-чат"
            variant="secondary"
            onPress={() => (token ? openChat() : navigation.navigate("Login"))}
          />
        )}
      </BottomActions>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { fontSize: 14, marginBottom: space.sm, color: colors.textSecondary, lineHeight: 20 }
});
