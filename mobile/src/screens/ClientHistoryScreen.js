import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RefreshButton } from "../components/RefreshButton";
import { StatusBadge } from "../components/StatusBadge";
import { navigateToStack } from "../utils/navigation";

const KIND_LABELS = {
  request: "Заявка",
  order: "Заказ",
  document: "Документ",
  complaint: "Претензия"
};

const DOC_TYPE_LABELS = { payment: "Оплата", service: "Сервис", act: "Акт" };

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ClientHistoryScreen({ navigation }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await api.clientHistory(token));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => setError(e.message));
    }, [load])
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

  const openItem = (item) => {
    if (item.kind === "order" && item.id) {
      navigateToStack(navigation, "ClientOrderDetail", { orderId: item.id });
    } else if (item.kind === "request" && item.id) {
      navigateToStack(navigation, "ClientRequestForm", { requestId: item.id });
    } else if (item.kind === "document" && item.order_id) {
      navigateToStack(navigation, "ClientOrderDetail", { orderId: item.order_id });
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <RefreshButton onPress={onRefresh} loading={refreshing} />
        <Text style={styles.title}>История обращений</Text>
        <Text style={styles.subtitle}>Заявки, заказы, документы и претензии в одном списке</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <FlatList
          style={styles.list}
          data={items}
          keyExtractor={(item, idx) => `${item.kind}-${item.id || item.order_id}-${idx}`}
          refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
          ListEmptyComponent={<Text style={styles.empty}>История пуста</Text>}
          renderItem={({ item }) => {
            const kind = item.kind || "request";
            const title =
              kind === "document"
                ? item.title || DOC_TYPE_LABELS[item.type] || "Документ"
                : kind === "complaint"
                  ? item.subject
                  : kind === "order"
                    ? `Заказ #${item.id}`
                    : `Заявка #${item.id}`;

            return (
              <Pressable style={styles.card} onPress={() => openItem(item)}>
                <View style={styles.row}>
                  <Text style={styles.kind}>{KIND_LABELS[kind] || kind}</Text>
                  {item.status && <StatusBadge status={item.status} type={kind === "order" ? "order" : "request"} />}
                  {kind === "complaint" && item.status && (
                    <Text style={styles.complaintStatus}>{item.status}</Text>
                  )}
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
                {!!item.address && <Text style={styles.muted}>{item.address}</Text>}
                {kind === "document" && !!item.content && (
                  <Text style={styles.muted} numberOfLines={2}>{item.content}</Text>
                )}
                {kind === "complaint" && !!item.body && (
                  <Text style={styles.muted} numberOfLines={2}>{item.body}</Text>
                )}
                <Text style={styles.date}>{formatDate(item.date)}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1, padding: 12 },
  list: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 12 },
  error: { color: "#b91c1c", marginBottom: 8 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  kind: { fontSize: 12, fontWeight: "700", color: "#0369a1", textTransform: "uppercase" },
  cardTitle: { fontWeight: "700", fontSize: 16, marginBottom: 4 },
  muted: { color: "#64748b", fontSize: 13 },
  date: { color: "#94a3b8", fontSize: 12, marginTop: 6 },
  complaintStatus: { fontSize: 12, color: "#64748b", marginLeft: "auto" }
});
