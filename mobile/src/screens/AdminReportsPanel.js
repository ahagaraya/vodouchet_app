import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RefreshButton } from "../components/RefreshButton";
import { ActionButton } from "../components/ActionButton";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function AdminReportsPanel() {
  const { token } = useAuth();
  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setReport(await api.adminReports(token, month));
  }, [token, month]);

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
      <Text style={styles.hint}>Отчёт за месяц (формат YYYY-MM)</Text>
      <TextInput style={styles.input} value={month} onChangeText={setMonth} placeholder="2026-05" />
      <ActionButton title="Загрузить отчёт" onPress={() => load().catch((e) => setError(e.message))} />
      {!!error && <Text style={styles.error}>{error}</Text>}
      {report && (
        <View style={styles.report}>
          <Text style={styles.reportTitle}>Отчёт за {report.month}</Text>
          <Text style={styles.row}>Выездов: <Text style={styles.val}>{report.visits}</Text></Text>
          <Text style={styles.row}>Завершено: <Text style={styles.val}>{report.completed_orders}</Text></Text>
          <Text style={styles.row}>Выручка: <Text style={styles.val}>{report.revenue?.toLocaleString("ru-RU")} ₽</Text></Text>
          <Text style={styles.row}>
            Средний рейтинг: <Text style={styles.val}>{report.ratings ?? "—"}</Text>
            {report.reviews_count > 0 && ` (${report.reviews_count} отз.)`}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 16 },
  hint: { color: "#64748b", marginBottom: 8, fontSize: 13 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: "#fff", fontSize: 16 },
  error: { color: "#b91c1c", marginTop: 8 },
  report: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginTop: 12 },
  reportTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  row: { fontSize: 15, color: "#475569", marginBottom: 6 },
  val: { fontWeight: "700", color: "#0f172a" }
});
