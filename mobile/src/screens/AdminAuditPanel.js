import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RefreshButton } from "../components/RefreshButton";

export function AdminAuditPanel() {
  const { token } = useAuth();
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setEntries(await api.adminAudit(token));
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
    <FlatList
      style={styles.flex}
      data={entries}
      keyExtractor={(item) => String(item.id)}
      refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <RefreshButton onPress={onRefresh} loading={refreshing} />
          <Text style={styles.hint}>Журнал действий (последние 100 записей)</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </>
      }
      ListEmptyComponent={<Text style={styles.empty}>Записей нет</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.action}>{item.action}</Text>
          <Text style={styles.muted}>
            {item.user_name} ({item.role}) · {item.entity_type} #{item.entity_id}
          </Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleString("ru-RU")}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: 16 },
  hint: { color: "#64748b", marginBottom: 10, fontSize: 13 },
  error: { color: "#b91c1c", marginBottom: 8 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 24 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 },
  action: { fontWeight: "700", fontSize: 14, marginBottom: 4 },
  muted: { color: "#64748b", fontSize: 13 },
  date: { color: "#94a3b8", fontSize: 12, marginTop: 4 }
});
