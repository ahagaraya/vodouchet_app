import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RefreshButton } from "../components/RefreshButton";

function StatCard({ label, value, color = "#0ea5e9" }) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

export function AdminDashboardPanel() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setStats(await api.adminDashboard(token));
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

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <RefreshButton onPress={onRefresh} loading={refreshing} />
      <Text style={styles.hint}>Сводка по заявкам, просрочкам и выручке</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {stats && (
        <>
          <StatCard label="Новые заявки" value={stats.new_requests} color="#0ea5e9" />
          <StatCard label="Просроченные выезды" value={stats.overdue_orders} color="#ef4444" />
          <StatCard label="Выручка (оплачено)" value={`${stats.revenue?.toLocaleString("ru-RU") || 0} ₽`} color="#16a34a" />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 16 },
  hint: { color: "#64748b", marginBottom: 12, fontSize: 13 },
  error: { color: "#b91c1c", marginBottom: 8 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 16, marginBottom: 10, borderLeftWidth: 4 },
  cardLabel: { fontSize: 13, color: "#64748b", marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: "700" }
});
