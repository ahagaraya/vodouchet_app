import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RefreshButton } from "../components/RefreshButton";
import { navigateToStack } from "../utils/navigation";
import { StatusBadge } from "../components/StatusBadge";

const ROLE_LABELS = { client: "Клиент", employee: "Специалист" };

function ThreadCard({ title, lastMessage, lastAt, unread, onPress, children }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>{title}</Text>
        {unread > 0 && (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{unread}</Text>
          </View>
        )}
      </View>
      <Text style={styles.preview} numberOfLines={2}>{lastMessage}</Text>
      <Text style={styles.muted}>{new Date(lastAt).toLocaleString("ru-RU")}</Text>
      {children}
    </Pressable>
  );
}

export function AdminChatsPanel({ navigation }) {
  const { token } = useAuth();
  const [inbox, setInbox] = useState({ general: [], orders: [], unread_total: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setInbox(await api.adminChatInbox(token));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 15000);
      return () => clearInterval(t);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openGeneral = (item) => {
    navigateToStack(navigation, "ChatThread", {
      mode: "general",
      userId: item.user_id,
      title: `${item.user_name} (${ROLE_LABELS[item.user_role] || item.user_role})`
    });
  };

  const openOrder = (item) => {
    navigateToStack(navigation, "ChatThread", {
      mode: "order",
      orderId: item.order_id,
      title: `Заказ #${item.order_id}`
    });
  };

  const empty = !inbox.general.length && !inbox.orders.length;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.listPad}
      {...(Platform.OS === "web" ? { style: [styles.flex, { overflow: "scroll" }] } : {})}
    >
      <RefreshButton onPress={onRefresh} loading={refreshing} />
      <Text style={styles.sectionHint}>
        Общие вопросы и чаты по заказам (как в Uber/Яндекс: отдельно поддержка и чат по поездке). Непрочитанных:{" "}
        {inbox.unread_total}
      </Text>

      <Text style={styles.sectionTitle}>Общие вопросы</Text>
      {inbox.general.length === 0 && <Text style={styles.emptySection}>Нет общих диалогов</Text>}
      {inbox.general.map((g) => (
        <ThreadCard
          key={`g-${g.user_id}`}
          title={`${g.user_name} · ${ROLE_LABELS[g.user_role] || g.user_role}`}
          lastMessage={g.last_message}
          lastAt={g.last_at}
          unread={g.unread_count}
          onPress={() => openGeneral(g)}
        />
      ))}

      <Text style={[styles.sectionTitle, styles.sectionTop]}>Чаты по заказам</Text>
      {inbox.orders.length === 0 && <Text style={styles.emptySection}>Нет чатов по заказам</Text>}
      {inbox.orders.map((o) => (
        <ThreadCard
          key={`o-${o.order_id}`}
          title={`Заказ #${o.order_id} · ${o.address}`}
          lastMessage={o.last_message}
          lastAt={o.last_at}
          unread={o.unread_count}
          onPress={() => openOrder(o)}
        >
          {!!o.order_status && <StatusBadge status={o.order_status} type="order" />}
          <Text style={styles.muted}>{o.client_name} · {o.specialist_name}</Text>
        </ThreadCard>
      ))}

      {empty && <Text style={styles.empty}>Сообщения появятся, когда клиент или сотрудник напишут в чат</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  listPad: { paddingBottom: 12 },
  sectionHint: { color: "#64748b", marginBottom: 12, fontSize: 13 },
  sectionTitle: { fontWeight: "700", fontSize: 15, marginBottom: 8, color: "#334155" },
  sectionTop: { marginTop: 16 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, gap: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "700", flex: 1, fontSize: 15 },
  preview: { color: "#475569", fontSize: 14 },
  muted: { color: "#94a3b8", fontSize: 12 },
  unread: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, paddingHorizontal: 6, alignItems: "center" },
  unreadText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  emptySection: { color: "#94a3b8", marginBottom: 8, fontSize: 13 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 }
});
