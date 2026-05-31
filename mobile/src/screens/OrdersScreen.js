import React, { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { ListSortChips } from "../components/ListSortChips";
import { RefreshButton } from "../components/RefreshButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { commonStyles } from "../styles/common";
import { sortOrders } from "../utils/listSort";
import { colors, radius, space } from "../theme";

function formatVisitDate(date, time) {
  if (!date) return "Дата не указана";
  return time ? `${date} · ${time}` : date;
}

function formatCost(value) {
  if (value == null || value === "") return "—";
  return `~${value} ₽`;
}

export function OrdersScreen({ navigation }) {
  const { token, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState("new");

  const sortedOrders = useMemo(() => sortOrders(orders, sortBy), [orders, sortBy]);

  const load = async () => {
    if (!token) return;
    try {
      setError("");
      setOrders(await api.orders(token));
    } catch (e) {
      setError(e.message);
      setOrders([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!profile) {
    return (
      <View style={commonStyles.screen}>
        <View style={styles.center}>
          <ScreenHeader title="Мои выезды" subtitle="Войдите как специалист, чтобы видеть назначенные заказы" />
        </View>
        <BottomActions>
          <ActionButton title="Войти" onPress={() => navigation.navigate("Login")} />
        </BottomActions>
      </View>
    );
  }

  return (
    <View style={commonStyles.screen}>
      <View style={styles.container}>
        <ScreenHeader
          title="Мои выезды"
          subtitle={Platform.OS === "web" ? "Нажмите «↻ Обновить» для обновления" : "Потяните список вниз для обновления"}
          right={<RefreshButton onPress={onRefresh} loading={refreshing} />}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <ListSortChips sortBy={sortBy} onChange={setSortBy} />
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={sortedOrders}
          keyExtractor={(item) => String(item.id)}
          refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
          ListEmptyComponent={<Text style={styles.empty}>Нет назначенных выездов</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.card, pressed && commonStyles.listCardPressed]}
              onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Выезд #{item.id}</Text>
                <StatusBadge status={item.status} type="order" />
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldBlock}>
                <Text style={commonStyles.fieldLabel}>Адрес</Text>
                <Text style={styles.fieldValue}>{item.address || "—"}</Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaCell}>
                  <Text style={commonStyles.fieldLabel}>Дата и время</Text>
                  <Text style={styles.fieldValue}>{formatVisitDate(item.visit_date, item.visit_time)}</Text>
                </View>
                <View style={styles.metaCell}>
                  <Text style={commonStyles.fieldLabel}>Стоимость</Text>
                  <Text style={styles.fieldValue}>{formatCost(item.estimated_cost)}</Text>
                </View>
              </View>

              {(item.contact_name || item.contact_phone) && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.fieldBlock}>
                    <Text style={commonStyles.fieldLabel}>Контакт</Text>
                    {!!item.contact_name && <Text style={styles.fieldValue}>{item.contact_name}</Text>}
                    {!!item.contact_phone && <Text style={styles.fieldMuted}>{item.contact_phone}</Text>}
                  </View>
                </>
              )}

              {!!item.client_comments && (
                <View style={styles.noteBlock}>
                  <Text style={commonStyles.fieldLabel}>Комментарий клиента</Text>
                  <Text style={styles.fieldMuted}>{item.client_comments}</Text>
                </View>
              )}
            </Pressable>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg, minHeight: 0 },
  list: { flex: 1, minHeight: 0, ...(Platform.OS === "web" ? { overflow: "scroll" } : {}) },
  listContent: { paddingBottom: space.lg },
  center: { flex: 1, padding: space.lg, justifyContent: "center" },
  error: { color: colors.danger, marginBottom: space.sm },
  empty: { textAlign: "center", color: colors.textSubtle, marginTop: space.xxl },
  card: {
    ...commonStyles.listCard,
    gap: 0,
    padding: space.lg
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.sm
  },
  cardTitle: { fontWeight: "700", fontSize: 17, flex: 1, color: colors.text },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: space.md
  },
  fieldBlock: { marginBottom: space.sm },
  fieldValue: { fontSize: 15, color: colors.text, lineHeight: 22 },
  fieldMuted: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    gap: space.lg,
    marginTop: space.xs
  },
  metaCell: { flex: 1, minWidth: 0 },
  noteBlock: {
    marginTop: space.sm,
    padding: space.md,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight
  }
});
