import React, { useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable, Platform } from "react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { StatusBadge } from "../components/StatusBadge";
import { enterToSubmit } from "../utils/enterSubmit";

/** Только поиск заказов и клиентов по запросу */
export function AdminSearchPanel({ onOpenOrder }) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ orders: [], clients: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runSearch = async () => {
    if (!token) return;
    const q = query.trim();
    if (!q) {
      setResults({ orders: [], clients: [] });
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResults(await api.adminSearch(token, q));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.listPad}
      keyboardShouldPersistTaps="handled"
      {...(Platform.OS === "web" ? { style: [styles.flex, { overflow: "scroll" }] } : {})}
    >
      <Text style={styles.sectionHint}>
        Поиск: № заказа (#7 или 7), адрес, имя или телефон заказчика. Список всех клиентов — вкладка «Клиенты».
      </Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Например: #7, 7, ул. Ленина, Анна"
        value={query}
        onChangeText={setQuery}
        {...enterToSubmit(runSearch)}
      />
      <View style={styles.searchRow}>
        <ActionButton title="Найти" onPress={runSearch} loading={loading} />
        <ActionButton
          title="Сброс"
          variant="secondary"
          onPress={() => {
            setQuery("");
            setResults({ orders: [], clients: [] });
          }}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {!query.trim() && (
        <Text style={styles.emptySection}>Введите запрос и нажмите «Найти»</Text>
      )}

      {!!query.trim() && (
        <>
          <Text style={styles.sectionTitle}>Заказы ({results.orders.length})</Text>
          {results.orders.length === 0 && <Text style={styles.emptySection}>Заказы не найдены</Text>}
          {results.orders.map((o) => (
            <View key={o.id} style={styles.card}>
              <Pressable onPress={() => onOpenOrder(o)}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>Заказ #{o.id}</Text>
                  <StatusBadge status={o.status} type="order" />
                </View>
                <Text>{o.address}</Text>
                <Text style={styles.muted}>
                  Заказчик: {o.client_name} · {o.client_phone || "—"}
                </Text>
                <Text style={styles.muted}>Специалист: {o.specialist_name}</Text>
              </Pressable>
              <ActionButton title="Открыть заказ" variant="secondary" onPress={() => onOpenOrder(o)} />
            </View>
          ))}

          <Text style={[styles.sectionTitle, styles.sectionTop]}>Клиенты ({results.clients.length})</Text>
          {results.clients.length === 0 && <Text style={styles.emptySection}>Клиенты не найдены</Text>}
          {results.clients.map((c) => (
            <View key={c.id} style={styles.card}>
              <Text style={styles.cardTitle}>{c.full_name}</Text>
              <Text style={styles.muted}>
                {c.login} · заказов: {c.orders_count}
              </Text>
              <Text style={styles.muted}>Откройте вкладку «Клиенты» для полной истории</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  listPad: { paddingBottom: 16 },
  sectionHint: { color: "#64748b", marginBottom: 10, fontSize: 13 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    marginBottom: 8
  },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  sectionTitle: { fontWeight: "700", fontSize: 15, marginBottom: 8, marginTop: 4, color: "#334155" },
  sectionTop: { marginTop: 16 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, gap: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  cardTitle: { fontWeight: "700", fontSize: 15, flex: 1 },
  muted: { color: "#64748b", fontSize: 13 },
  emptySection: { color: "#94a3b8", marginTop: 8, fontSize: 13 },
  error: { color: "#b91c1c", marginBottom: 8 }
});
