import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { navigateToStack } from "../utils/navigation";
import { ordersCountLabel } from "../utils/specialistStats";
import { confirmAction } from "../utils/confirm";
import { showFeedback } from "../utils/feedback";
import { commonStyles } from "../styles/common";
import { colors, space } from "../theme";

const ROLE_LABELS = { admin: "Администратор", client: "Клиент", employee: "Выездной специалист" };

export function ProfileScreen({ navigation }) {
  const { profile, logout, token, refreshProfile } = useAuth();
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshProfile?.().catch(() => {});
    }, [refreshProfile])
  );

  const deleteAccount = async () => {
    if (!(await confirmAction("Удалить аккаунт без возможности восстановления?"))) return;
    setDeleting(true);
    try {
      await api.deleteProfile(token);
      showFeedback("Готово", "Аккаунт удалён");
      logout();
    } catch (e) {
      showFeedback("Ошибка", e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!profile) {
    return (
      <View style={commonStyles.screen}>
        <View style={styles.center}>
          <ScreenHeader title="Личный кабинет" subtitle="Войдите, чтобы видеть заявки, выезды и профиль" />
        </View>
        <BottomActions>
          <ActionButton title="Войти" onPress={() => navigateToStack(navigation, "Login")} />
          <ActionButton title="Регистрация" variant="secondary" onPress={() => navigateToStack(navigation, "Register")} />
        </BottomActions>
      </View>
    );
  }

  const roleLabel = ROLE_LABELS[profile.role] || profile.role;

  return (
    <View style={commonStyles.screen}>
      <ScrollView style={commonStyles.scroll} contentContainerStyle={commonStyles.content}>
        <ScreenHeader title={profile.fullName} subtitle={roleLabel} />

        <SectionCard title="Контакты">
          {!!profile.email && <Text style={styles.meta}>Email: {profile.email}</Text>}
          {!!profile.phone && <Text style={styles.meta}>Телефон: {profile.phone}</Text>}
          {!!profile.address && <Text style={styles.meta}>Адрес: {profile.address}</Text>}
          {profile.position && profile.role === "employee" && (
            <Text style={styles.meta}>Должность: {profile.position}</Text>
          )}
        </SectionCard>

        {profile.role === "employee" && (
          <SectionCard title="Статистика" tone="success">
            <Text style={styles.stat}>
              Выполнено: {profile.completed_orders_count ?? 0} {ordersCountLabel(profile.completed_orders_count ?? 0)}
            </Text>
            {(profile.reviews_count ?? 0) > 0 ? (
              <Text style={styles.meta}>
                Рейтинг {profile.rating_avg?.toFixed(1)} · {profile.reviews_count} отз.
              </Text>
            ) : (
              <Text style={styles.metaMuted}>Пока нет отзывов от клиентов</Text>
            )}
          </SectionCard>
        )}

        <SectionCard tone="muted" subtitle={
          profile.role === "client"
            ? "Заявки — во вкладке «Мои заявки»"
            : profile.role === "employee"
              ? "Выезды — во вкладке «Выезды», отзывы — в «Отзывы»"
              : "Управление — «Админ», каталог услуг — «Каталог»"
        } />
      </ScrollView>

      <BottomActions compact>
        {profile.role === "employee" && (
          <ActionButton title="Мои выезды" onPress={() => navigation.navigate("Выезды")} />
        )}
        {profile.role === "client" && (
          <ActionButton title="Мои заявки" onPress={() => navigation.navigate("Мои заявки")} />
        )}
        {profile.role === "admin" && (
          <ActionButton title="Админ-панель" onPress={() => navigation.navigate("Админ")} />
        )}
        <ActionButton title="Редактировать" variant="secondary" onPress={() => navigateToStack(navigation, "ProfileEdit")} />
        <ActionButton title="Выход" variant="secondary" onPress={logout} />
        <ActionButton title="Удалить аккаунт" color={colors.danger} loading={deleting} onPress={deleteAccount} />
      </BottomActions>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: space.lg },
  meta: { fontSize: 15, color: colors.textSecondary, marginBottom: 4, lineHeight: 22 },
  stat: { fontSize: 16, fontWeight: "700", color: "#0f766e" },
  metaMuted: { fontSize: 14, color: colors.textMuted }
});
