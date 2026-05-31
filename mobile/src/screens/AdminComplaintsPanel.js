import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { RefreshButton } from "../components/RefreshButton";
import { showFeedback } from "../utils/feedback";

const STATUS_OPTIONS = [
  { key: "new", label: "Новая" },
  { key: "in_progress", label: "В работе" },
  { key: "resolved", label: "Решена" }
];

export function AdminComplaintsPanel() {
  const { token } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setComplaints(await api.adminComplaints(token));
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

  const updateComplaint = async (id, payload) => {
    setSaving(true);
    try {
      await api.adminComplaintUpdate(token, id, payload);
      showFeedback("Сохранено", "Претензия обновлена");
      setExpandedId(null);
      setReplyText("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlatList
      style={styles.flex}
      data={complaints}
      keyExtractor={(item) => String(item.id)}
      refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <RefreshButton onPress={onRefresh} loading={refreshing} />
          <Text style={styles.hint}>Претензии клиентов</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
        </>
      }
      ListEmptyComponent={<Text style={styles.empty}>Претензий нет</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Pressable onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}>
            <Text style={styles.cardTitle}>{item.subject}</Text>
            <Text style={styles.muted}>{item.client_name} · {item.status}</Text>
            {!!item.order_id && <Text style={styles.muted}>Заказ #{item.order_id}</Text>}
          </Pressable>
          <Text style={styles.body}>{item.body}</Text>
          {!!item.admin_reply && (
            <View style={styles.replyBlock}>
              <Text style={styles.replyLabel}>Ответ:</Text>
              <Text>{item.admin_reply}</Text>
            </View>
          )}
          {expandedId === item.id && (
            <View style={styles.actions}>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((s) => (
                  <Pressable
                    key={s.key}
                    style={[styles.statusChip, item.status === s.key && styles.statusChipActive]}
                    onPress={() => updateComplaint(item.id, { status: s.key })}
                  >
                    <Text style={item.status === s.key ? styles.statusTextActive : styles.statusText}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.tall]}
                multiline
                placeholder="Ответ клиенту"
                value={replyText}
                onChangeText={setReplyText}
              />
              <ActionButton
                title="Отправить ответ"
                loading={saving}
                onPress={() => updateComplaint(item.id, { admin_reply: replyText.trim() })}
              />
            </View>
          )}
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
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10 },
  cardTitle: { fontWeight: "700", fontSize: 15, marginBottom: 4 },
  muted: { color: "#64748b", fontSize: 13 },
  body: { fontSize: 14, color: "#334155", marginTop: 8 },
  replyBlock: { backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 8 },
  replyLabel: { fontWeight: "600", color: "#166534", marginBottom: 4 },
  actions: { marginTop: 10, gap: 8 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f1f5f9" },
  statusChipActive: { backgroundColor: "#e0f2fe" },
  statusText: { fontSize: 12, color: "#475569" },
  statusTextActive: { fontSize: 12, color: "#0369a1", fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, backgroundColor: "#fff", fontSize: 16 },
  tall: { minHeight: 60, textAlignVertical: "top" }
});
