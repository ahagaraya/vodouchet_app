import React, { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { StarsDisplay } from "../components/StarRating";
import { RefreshButton } from "../components/RefreshButton";
import { ReviewSortChips } from "../components/ReviewSortChips";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { ratingFromReviews, reviewCountLabel, sortReviews } from "../utils/reviewSort";

export function EmployeeReviewsScreen({ route }) {
  const { employeeId, employeeName } = route.params || {};
  const { token } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("new");

  const load = useCallback(async () => {
    if (!token || !employeeId) return;
    setLoading(true);
    try {
      setError("");
      const detail = await api.adminUser(token, employeeId);
      setReviews(detail.reviews || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, employeeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sortedList = useMemo(() => sortReviews(reviews, sortBy), [reviews, sortBy]);
  const stats = ratingFromReviews(reviews);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <RefreshButton onPress={load} loading={loading} />
        <Text style={styles.title}>{employeeName || "Специалист"}</Text>
        <Text style={styles.subtitle}>Отзывы клиентов</Text>

        <View style={styles.ratingBlock}>
          <Text style={styles.ratingLabel}>Общий рейтинг</Text>
          {stats.count > 0 ? (
            <View style={styles.ratingRow}>
              <StarsDisplay value={Math.round(stats.avg)} size={22} />
              <Text style={styles.ratingValue}>
                {stats.avg.toFixed(1)} · {stats.count} {reviewCountLabel(stats.count)}
              </Text>
            </View>
          ) : (
            <Text style={styles.muted}>Пока нет отзывов</Text>
          )}
        </View>

        <FeedbackBanner message={error} type="error" />

        {sortedList.length > 1 && <ReviewSortChips sortBy={sortBy} onChange={setSortBy} />}

        <FlatList
          style={styles.list}
          data={sortedList}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.empty}>Пока нет отзывов о работе специалиста</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.name}>{item.client_name || item.full_name}</Text>
                <StarsDisplay value={item.rating} size={18} />
              </View>
              {!!item.order_address && <Text style={styles.muted}>Заказ: {item.order_address}</Text>}
              <Text style={styles.comment}>{item.comment}</Text>
              <Text style={styles.muted}>{new Date(item.created_at).toLocaleDateString("ru-RU")}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#f8fafc", minHeight: 0 },
  container: { flex: 1, padding: 12, minHeight: 0 },
  list: { flex: 1, minHeight: 0, ...(Platform.OS === "web" ? { overflow: "scroll" } : {}) },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4, color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 12 },
  ratingBlock: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  ratingLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ratingValue: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  muted: { color: "#64748b", fontSize: 13 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 20 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  name: { fontWeight: "700", fontSize: 15 },
  comment: { fontSize: 15, marginTop: 4, marginBottom: 6, color: "#334155" }
});
