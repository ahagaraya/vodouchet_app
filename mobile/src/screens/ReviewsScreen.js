import React, { useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { StarRating, StarsDisplay } from "../components/StarRating";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { RefreshButton } from "../components/RefreshButton";
import { ReviewSortChips } from "../components/ReviewSortChips";
import { ratingFromReviews, reviewCountLabel, sortReviews } from "../utils/reviewSort";
import { commonStyles } from "../styles/common";
import { colors, radius, shadow, space } from "../theme";

export function ReviewsScreen() {
  const { token, profile } = useAuth();
  const route = useRoute();
  const [reviews, setReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState("new");
  const [replyTexts, setReplyTexts] = useState({});
  const [replySaving, setReplySaving] = useState(null);

  const load = async () => {
    setError("");
    const pub = await api.reviews();
    setReviews(pub);
    if (token && profile?.role === "employee") {
      setMyReviews(await api.myReviews(token));
    }
    if (token && profile?.role === "client") {
      setCompletedOrders(await api.reviewableOrders(token));
    }
  };

  useFocusEffect(
    useCallback(() => {
      load()
        .then(() => {
          const oid = route.params?.orderId;
          if (oid && profile?.role === "client" && route.params?.openReviewForm) {
            setOrderId(String(oid));
            setShowForm(true);
            setStatus("");
            setError("");
          }
        })
        .catch((e) => setError(e.message));
    }, [token, profile?.role, route.params?.orderId, route.params?.openReviewForm])
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

  const submit = async () => {
    if (!orderId) {
      setError("Выберите заказ для отзыва");
      return;
    }
    if (!comment.trim()) {
      setError("Напишите текст отзыва");
      return;
    }
    setSaving(true);
    try {
      setError("");
      await api.addReview(token, { rating, comment: comment.trim(), order_id: Number(orderId) });
      setComment("");
      setRating(5);
      setOrderId("");
      setShowForm(false);
      setStatus("Отзыв добавлен");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async (reviewId) => {
    const text = replyTexts[reviewId]?.trim();
    if (!text) {
      setError("Укажите текст ответа");
      return;
    }
    setReplySaving(reviewId);
    try {
      await api.adminReviewReply(token, reviewId, text);
      setReplyTexts((prev) => ({ ...prev, [reviewId]: "" }));
      setStatus("Ответ опубликован");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setReplySaving(null);
    }
  };

  const listData = profile?.role === "employee" ? myReviews : reviews;
  const sortedList = useMemo(() => sortReviews(listData, sortBy), [listData, sortBy]);
  const myStats = profile?.role === "employee" ? ratingFromReviews(myReviews) : null;
  const clientWritingReview = showForm && profile?.role === "client";

  return (
    <View style={commonStyles.screen}>
      <View style={styles.container}>
        <RefreshButton onPress={onRefresh} loading={refreshing} />
        <ScreenHeader
          title={profile?.role === "employee" ? "Отзывы обо мне" : "Отзывы клиентов"}
          subtitle={profile?.role === "employee" ? "Оценки клиентов после выполненных выездов" : undefined}
        />
        {profile?.role === "employee" && (
          <SectionCard title="Общий рейтинг">
            {myStats.count > 0 ? (
              <View style={styles.ratingRow}>
                <StarsDisplay value={Math.round(myStats.avg)} size={22} />
                <Text style={styles.ratingValue}>
                  {myStats.avg.toFixed(1)} · {myStats.count} {reviewCountLabel(myStats.count)}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>Пока нет отзывов</Text>
            )}
          </SectionCard>
        )}
        <FeedbackBanner message={error || status} type={error ? "error" : status ? "success" : "info"} />

        {clientWritingReview ? (
          <SectionCard title="Новый отзыв">
            <Text style={commonStyles.fieldLabel}>Заказ *</Text>
            {completedOrders.length === 0 ? (
              <Text style={styles.muted}>Нет завершённых заказов для отзыва</Text>
            ) : (
              completedOrders.map((o) => (
                <Pressable
                  key={o.id}
                  style={[styles.orderChip, orderId === String(o.id) && styles.orderChipActive]}
                  onPress={() => setOrderId(String(o.id))}
                >
                  <Text style={styles.orderChipText}>#{o.id} · {o.address}</Text>
                  <Text style={styles.muted}>Специалист: {o.specialist_name}</Text>
                </Pressable>
              ))
            )}
            <Text style={commonStyles.fieldLabel}>Оценка *</Text>
            <StarRating value={rating} onChange={setRating} />
            <TextInput
              style={[commonStyles.input, styles.tall]}
              multiline
              placeholder="Ваш отзыв о работе специалиста"
              value={comment}
              onChangeText={setComment}
            />
          </SectionCard>
        ) : (
          <>
            {sortedList.length > 1 && <ReviewSortChips sortBy={sortBy} onChange={setSortBy} />}

            <FlatList
              style={styles.list}
              data={sortedList}
              keyExtractor={(item) => String(item.id)}
              refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {profile?.role === "employee" ? "Пока нет отзывов о вашей работе" : "Пока нет отзывов"}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={commonStyles.listCard}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.client_name || item.full_name}</Text>
                    <StarsDisplay value={item.rating} size={18} />
                  </View>
                  {!!item.employee_name && <Text style={styles.muted}>Специалист: {item.employee_name}</Text>}
                  {!!item.order_address && <Text style={styles.muted}>Заказ: {item.order_address}</Text>}
                  <Text style={styles.comment}>{item.comment}</Text>
                  {!!item.admin_reply?.text && (
                    <View style={styles.adminReply}>
                      <Text style={styles.adminReplyLabel}>Ответ компании{item.admin_reply.admin_name ? ` (${item.admin_reply.admin_name})` : ""}:</Text>
                      <Text style={styles.adminReplyText}>{item.admin_reply.text}</Text>
                    </View>
                  )}
                  {profile?.role === "admin" && !item.admin_reply?.text && (
                    <View style={styles.replyForm}>
                      <TextInput
                        style={[commonStyles.input, styles.tall]}
                        multiline
                        placeholder="Ответ администратора"
                        value={replyTexts[item.id] || ""}
                        onChangeText={(v) => setReplyTexts((prev) => ({ ...prev, [item.id]: v }))}
                      />
                      <ActionButton title="Ответить" size="sm" loading={replySaving === item.id} onPress={() => submitReply(item.id)} />
                    </View>
                  )}
                </View>
              )}
            />
          </>
        )}
      </View>

      {profile?.role === "client" && token && (
        <BottomActions>
          {!showForm ? (
            <ActionButton title="Добавить отзыв" onPress={() => { setShowForm(true); setStatus(""); setError(""); }} />
          ) : (
            <>
              <ActionButton title="Опубликовать отзыв" loading={saving} onPress={submit} />
              <ActionButton title="Отмена" variant="secondary" onPress={() => setShowForm(false)} />
            </>
          )}
        </BottomActions>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg, minHeight: 0 },
  list: { flex: 1, minHeight: 0 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  ratingValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { color: colors.textMuted, fontSize: 13 },
  empty: { textAlign: "center", color: colors.textSubtle, marginTop: space.xl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm },
  name: { fontWeight: "700", fontSize: 15, color: colors.text },
  comment: { fontSize: 15, marginTop: space.sm, color: colors.textSecondary, lineHeight: 22 },
  adminReply: { backgroundColor: colors.successSoft, borderRadius: radius.md, padding: space.md, marginTop: space.md, borderWidth: 1, borderColor: "#bbf7d0" },
  adminReplyLabel: { fontWeight: "600", color: "#166534", fontSize: 13, marginBottom: 4 },
  adminReplyText: { fontSize: 14, color: colors.textSecondary },
  replyForm: { marginTop: space.md, gap: space.sm },
  orderChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, marginBottom: space.sm, backgroundColor: colors.surface },
  orderChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  orderChipText: { fontWeight: "600", color: colors.text },
  tall: { minHeight: 80, textAlignVertical: "top" }
});
