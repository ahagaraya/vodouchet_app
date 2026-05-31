import React, { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { ButtonRow } from "../components/ButtonRow";
import { RefreshButton } from "../components/RefreshButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { navigateToStack } from "../utils/navigation";
import { isOrderItem, orderCancellable, orderEditable, requestEditable } from "../utils/statusLabels";
import { confirmAction } from "../utils/confirm";
import { showFeedback } from "../utils/feedback";
import { commonStyles } from "../styles/common";
import { ListSortChips } from "../components/ListSortChips";
import { sortListItems } from "../utils/listSort";
import { colors, radius, space } from "../theme";

export function ClientRequestsScreen({ navigation }) {
  const { token, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [sortBy, setSortBy] = useState("new");

  const sortedItems = useMemo(() => sortListItems(items, sortBy), [items, sortBy]);

  const openOrder = (orderId) => navigateToStack(navigation, "ClientOrderDetail", { orderId });

  const openItem = (item) => {
    if (isOrderItem(item)) {
      openOrder(item.id);
      return;
    }
    if (item.order_id) {
      openOrder(item.order_id);
      return;
    }
    if (requestEditable(item.status)) {
      navigateToStack(navigation, "ClientRequestForm", { requestId: item.id });
    }
  };

  const load = async () => {
    if (!token) return;
    setItems(await api.clientRequests(token));
  };

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => setError(e.message));
    }, [token])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const cancelOrderFromList = async (orderId) => {
    if (!(await confirmAction("Отменить заказ?"))) return;
    setBusyId(`order-${orderId}`);
    try {
      await api.cancelClientOrder(token, orderId);
      showFeedback("Готово", "Заказ отменён");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancelRequestFromList = async (requestId) => {
    if (!(await confirmAction("Вы уверены, что хотите отменить заявку?"))) return;
    setBusyId(`req-${requestId}`);
    try {
      await api.cancelClientRequest(token, requestId);
      showFeedback("Готово", "Заявка отменена");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  if (profile && profile.role !== "client") {
    return (
      <View style={styles.wrapper}>
        <View style={styles.center}>
          <Text style={styles.title}>Мои заявки</Text>
          <Text style={styles.hint}>Этот раздел доступен только клиентам. Войдите под учётной записью клиента (например anna_k).</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.center}>
          <Text style={styles.title}>Мои заявки</Text>
          <Text style={styles.hint}>Войдите как клиент, чтобы оформить заявку на выезд</Text>
        </View>
        <BottomActions>
          <ActionButton title="Войти" onPress={() => navigateToStack(navigation, "Login")} />
        </BottomActions>
      </View>
    );
  }

  return (
    <View style={commonStyles.screen}>
      <View style={styles.container}>
        <RefreshButton onPress={onRefresh} loading={refreshing} />
        <View style={styles.headerRow}>
          <ScreenHeader
            title="Мои заявки и заказы"
            subtitle="Заявки до подтверждения — «Изменить». После согласования — откройте заказ"
            style={styles.headerFlex}
          />
          <Pressable style={styles.historyBtn} onPress={() => navigateToStack(navigation, "ClientHistory")}>
            <Text style={styles.historyBtnText}>История</Text>
          </Pressable>
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <ListSortChips sortBy={sortBy} onChange={setSortBy} />
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={sortedItems}
          keyExtractor={(item) => `${item.type || (isOrderItem(item) ? "order" : "request")}-${item.id}`}
          refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет заявок. Создайте первую!</Text>}
          renderItem={({ item }) => {
            const isOrder = isOrderItem(item);
            const badgeType = isOrder ? "order" : "request";
            const canOpenOrder = isOrder || !!item.order_id;
            const canEditRequest = !isOrder && requestEditable(item.status);
            const canEditOrder = isOrder && orderEditable(item.status);
            const canCancelOrder = isOrder && orderCancellable(item.status);
            const canCancelRequest = !isOrder && requestEditable(item.status);

            return (
              <View style={commonStyles.listCard}>
                <Pressable onPress={() => openItem(item)}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>{isOrder ? `Заказ #${item.id}` : `Заявка #${item.id}`}</Text>
                    <StatusBadge status={item.status} type={badgeType} />
                  </View>
                  <Text style={styles.address}>{item.address}</Text>
                  <Text style={styles.muted}>{item.description || item.client_comments}</Text>
                  {!!item.visit_date && (
                    <Text style={styles.muted}>Желаемое время: {item.visit_date} {item.visit_time || ""}</Text>
                  )}
                  {!isOrder && !!item.preferred_specialist_name && (
                    <Text style={styles.muted}>
                      Желаемый специалист: {item.preferred_specialist_name}
                      {item.preferred_specialist_completed_orders != null
                        ? ` · выполнено ${item.preferred_specialist_completed_orders} заказов`
                        : ""}
                    </Text>
                  )}
                  {item.specialist_name && <Text style={styles.muted}>Специалист: {item.specialist_name}</Text>}
                  {isOrder && !canEditOrder && (
                    <Text style={styles.mutedHint}>Изменения только для активных заказов</Text>
                  )}
                </Pressable>
                <ButtonRow>
                  {canOpenOrder && (
                    <ActionButton
                      title={canEditOrder ? "Открыть" : "Заказ"}
                      variant="secondary"
                      size="sm"
                      onPress={() => openOrder(isOrder ? item.id : item.order_id)}
                    />
                  )}
                  {canEditRequest && (
                    <ActionButton
                      title="Изменить"
                      variant="secondary"
                      size="sm"
                      onPress={() => navigateToStack(navigation, "ClientRequestForm", { requestId: item.id })}
                    />
                  )}
                  {canCancelOrder && (
                    <ActionButton
                      title="Отменить"
                      color={colors.danger}
                      size="sm"
                      loading={busyId === `order-${item.id}`}
                      onPress={() => cancelOrderFromList(item.id)}
                    />
                  )}
                  {canCancelRequest && (
                    <ActionButton
                      title="Отменить заявку"
                      color={colors.danger}
                      size="sm"
                      loading={busyId === `req-${item.id}`}
                      onPress={() => cancelRequestFromList(item.id)}
                    />
                  )}
                </ButtonRow>
              </View>
            );
          }}
        />
      </View>
      <BottomActions>
        <ActionButton title="Новая заявка" onPress={() => navigateToStack(navigation, "ClientRequestForm", {})} />
      </BottomActions>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.bg, minHeight: 0 },
  container: { flex: 1, padding: space.lg, minHeight: 0 },
  center: { flex: 1, padding: space.lg, justifyContent: "center" },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingBottom: space.lg },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm, marginBottom: space.md },
  headerFlex: { flex: 1, marginBottom: 0 },
  historyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#bae6fd",
    marginTop: 4
  },
  historyBtnText: { color: colors.primaryDark, fontWeight: "600", fontSize: 13 },
  title: { fontSize: 22, fontWeight: "700", flex: 1, color: colors.text },
  hint: { textAlign: "center", color: colors.textMuted, marginBottom: space.lg },
  error: { color: colors.danger, marginBottom: space.sm },
  empty: { textAlign: "center", color: colors.textSubtle, marginTop: space.xxl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm, gap: space.sm },
  cardTitle: { fontWeight: "700", fontSize: 16, flex: 1, color: colors.text },
  address: { fontSize: 15, color: colors.text, marginBottom: 2 },
  muted: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  mutedHint: { color: colors.textSubtle, fontSize: 12, marginTop: space.sm, fontStyle: "italic" }
});
