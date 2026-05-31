import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { RefreshButton } from "../components/RefreshButton";
import { StatusBadge } from "../components/StatusBadge";
import { StarsDisplay } from "../components/StarRating";
import { navigateToStack } from "../utils/navigation";
import { ordersCountLabel } from "../utils/specialistStats";

const ROLE_LABELS = { client: "Клиент", employee: "Специалист" };

function EmployeeRating({ avg, count, size = 14 }) {
  if (!count) {
    return <Text style={styles.noRating}>Нет отзывов</Text>;
  }
  return (
    <View style={styles.ratingRow}>
      <StarsDisplay value={Math.round(avg)} size={size} />
      <Text style={styles.ratingText}>
        {avg.toFixed(1)} · {count} {count === 1 ? "отзыв" : count < 5 ? "отзыва" : "отзывов"}
      </Text>
    </View>
  );
}

function ReviewCard({ review, compact, embedded }) {
  return (
    <View style={[embedded ? styles.reviewInner : styles.card, compact && !embedded && styles.reviewPreview]}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>{review.client_name || review.full_name}</Text>
        <StarsDisplay value={review.rating} size={compact ? 14 : 16} />
      </View>
      {!!review.order_address && <Text style={styles.muted}>Заказ: {review.order_address}</Text>}
      <Text style={styles.reviewComment} numberOfLines={compact ? 2 : undefined}>
        {review.comment}
      </Text>
      <Text style={styles.muted}>{new Date(review.created_at).toLocaleDateString("ru-RU")}</Text>
    </View>
  );
}

function SectionPanel({ icon, title, subtitle, tone, children }) {
  return (
    <View style={[styles.sectionPanel, tone === "reviews" ? styles.reviewsPanel : styles.ordersPanel]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionHeading}>{title}</Text>
          {!!subtitle && <Text style={styles.sectionMeta}>{subtitle}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

export function AdminClientsPanel({ onOpenOrder }) {
  const { token } = useAuth();
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setUsers(await api.adminUsers(token));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => setError(e.message));
    }, [load])
  );

  const openUser = async (user) => {
    setLoading(true);
    setError("");
    try {
      setDetail(await api.adminUser(token, user.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openAllReviews = (user) => {
    navigateToStack(navigation, "EmployeeReviews", {
      employeeId: user.id,
      employeeName: user.full_name
    });
  };

  const back = () => {
    setDetail(null);
  };

  if (detail) {
    const { user, client_orders, employee_orders, requests, reviews = [] } = detail;
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.listPad}
        {...(Platform.OS === "web" ? { style: [styles.flex, { overflow: "scroll" }] } : {})}
      >
        <ActionButton title="← К списку" variant="secondary" onPress={back} />

        <View style={styles.profileCard}>
          <Text style={styles.clientTitle}>{user.full_name}</Text>
          <Text style={styles.muted}>
            {ROLE_LABELS[user.role] || user.role} · {user.login} · {user.email}
          </Text>
          <Text style={styles.muted}>{user.phone || "Телефон не указан"}</Text>
          {user.role === "employee" && (
            <View style={styles.profileRating}>
              <Text style={styles.profileStat}>
                Выполнено заказов: {user.completed_orders_count ?? 0}{" "}
                {ordersCountLabel(user.completed_orders_count ?? 0)}
              </Text>
              <Text style={styles.profileRatingLabel}>Общий рейтинг</Text>
              <EmployeeRating avg={user.rating_avg} count={user.reviews_count} size={18} />
            </View>
          )}
        </View>

        {user.role === "client" && (
          <>
            <Text style={styles.sectionTitle}>Заказы клиента ({client_orders.length})</Text>
            {client_orders.length === 0 && <Text style={styles.empty}>Нет заказов</Text>}
            {client_orders.map((o) => (
              <View key={`c-${o.id}`} style={styles.card}>
                <Pressable onPress={() => onOpenOrder(o)}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>#{o.id} · {o.address}</Text>
                    <StatusBadge status={o.status} type="order" />
                  </View>
                  <Text style={styles.muted}>{o.specialist_name} · {o.visit_date} {o.visit_time}</Text>
                </Pressable>
                <ActionButton title="Открыть заказ" variant="secondary" onPress={() => onOpenOrder(o)} />
              </View>
            ))}

            <Text style={[styles.sectionTitle, styles.sectionTop]}>Заявки ({requests.length})</Text>
            {requests.map((r) => (
              <View key={`r-${r.id}`} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>Заявка #{r.id}</Text>
                  <StatusBadge status={r.status} type="request" />
                </View>
                <Text>{r.address}</Text>
                <Text style={styles.muted}>{r.description}</Text>
              </View>
            ))}
          </>
        )}

        {user.role === "employee" && (
          <>
            <SectionPanel
              icon="⭐"
              title="Отзывы"
              subtitle={reviews.length ? `Последний из ${reviews.length}` : "Пока без отзывов"}
              tone="reviews"
            >
              {reviews.length === 0 && (
                <Text style={styles.panelEmpty}>Пока нет отзывов о работе специалиста</Text>
              )}
              {reviews.length > 0 && (
                <>
                  <ReviewCard review={reviews[0]} compact embedded />
                  {reviews.length > 1 && (
                    <Pressable style={styles.panelLink} onPress={() => openAllReviews(user)}>
                      <Text style={styles.panelLinkText}>Смотреть все отзывы ({reviews.length})</Text>
                      <Text style={styles.panelLinkArrow}>→</Text>
                    </Pressable>
                  )}
                </>
              )}
            </SectionPanel>

            <SectionPanel
              icon="🚗"
              title="Назначенные выезды"
              subtitle={`${employee_orders.length} ${employee_orders.length === 1 ? "заказ" : employee_orders.length < 5 ? "заказа" : "заказов"}`}
              tone="orders"
            >
              {employee_orders.length === 0 && <Text style={styles.panelEmpty}>Нет назначенных заказов</Text>}
              {employee_orders.map((o) => (
                <Pressable key={`e-${o.id}`} style={styles.orderCard} onPress={() => onOpenOrder(o)}>
                  <View style={styles.orderCardBody}>
                    <View style={styles.row}>
                      <Text style={styles.cardTitle}>#{o.id} · {o.address}</Text>
                      <StatusBadge status={o.status} type="order" />
                    </View>
                    <Text style={styles.muted}>Заказчик: {o.client_name}</Text>
                  </View>
                  <Text style={styles.orderChevron}>›</Text>
                </Pressable>
              ))}
            </SectionPanel>
          </>
        )}
      </ScrollView>
    );
  }

  const clients = users.filter((u) => u.role === "client");
  const employees = users.filter((u) => u.role === "employee");

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.listPad}
      {...(Platform.OS === "web" ? { style: [styles.flex, { overflow: "scroll" }] } : {})}
    >
      <RefreshButton onPress={load} loading={loading} />
      <Text style={styles.sectionHint}>Клиенты и специалисты — рейтинг, заказы и отзывы</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.sectionTitle}>Клиенты ({clients.length})</Text>
      {clients.map((u) => (
        <Pressable key={u.id} style={styles.card} onPress={() => openUser(u)}>
          <Text style={styles.cardTitle}>{u.full_name}</Text>
          <Text style={styles.muted}>
            {u.login} · заказов: {u.orders_count} · заявок: {u.requests_count}
          </Text>
          <Text style={styles.link}>История заказов →</Text>
        </Pressable>
      ))}

      <Text style={[styles.sectionTitle, styles.sectionTop]}>Специалисты ({employees.length})</Text>
      {employees.map((u) => (
        <Pressable key={u.id} style={styles.card} onPress={() => openUser(u)}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>{u.full_name}</Text>
            <EmployeeRating avg={u.rating_avg} count={u.reviews_count} />
          </View>
          <Text style={styles.muted}>
            {u.position} · выполнено {u.completed_orders_count ?? 0} {ordersCountLabel(u.completed_orders_count ?? 0)}
          </Text>
          {u.last_review ? (
            <View style={styles.previewBlock}>
              <Text style={styles.previewLabel}>Последний отзыв</Text>
              <ReviewCard review={u.last_review} compact />
            </View>
          ) : null}
          <Text style={styles.link}>Карточка специалиста →</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  listPad: { paddingBottom: 16, gap: 12 },
  sectionHint: { color: "#64748b", marginBottom: 12, fontSize: 13 },
  sectionTitle: { fontWeight: "700", fontSize: 15, marginBottom: 8, color: "#334155" },
  sectionTop: { marginTop: 16 },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 4
  },
  profileRating: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 6
  },
  profileRatingLabel: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  profileStat: { fontSize: 15, fontWeight: "700", color: "#0f766e" },
  sectionPanel: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10
  },
  reviewsPanel: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  ordersPanel: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0"
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  sectionIcon: { fontSize: 22, lineHeight: 26 },
  sectionHeaderText: { flex: 1 },
  sectionHeading: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  sectionMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  panelEmpty: { color: "#94a3b8", fontSize: 13, paddingVertical: 4 },
  panelLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderWidth: 1,
    borderColor: "#fcd34d"
  },
  panelLinkText: { color: "#b45309", fontWeight: "700", fontSize: 14 },
  panelLinkArrow: { color: "#b45309", fontSize: 18, fontWeight: "700" },
  reviewInner: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a"
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 3,
    borderLeftColor: "#0ea5e9",
    gap: 8,
    ...(Platform.OS === "web" ? { cursor: "pointer" } : {})
  },
  orderCardBody: { flex: 1, gap: 4 },
  orderChevron: { fontSize: 24, color: "#94a3b8", lineHeight: 28, paddingLeft: 4 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8, gap: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardTitle: { fontWeight: "700", fontSize: 15, flex: 1 },
  clientTitle: { fontSize: 22, fontWeight: "700", marginTop: 0 },
  muted: { color: "#64748b", fontSize: 13 },
  link: { color: "#0ea5e9", fontSize: 12, marginTop: 4 },
  empty: { color: "#94a3b8", marginBottom: 12 },
  error: { color: "#b91c1c", marginBottom: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  ratingText: { color: "#64748b", fontSize: 12 },
  noRating: { color: "#94a3b8", fontSize: 12 },
  reviewComment: { fontSize: 15, color: "#334155", marginTop: 4 },
  reviewPreview: { marginTop: 4, marginBottom: 0, backgroundColor: "#f8fafc" },
  previewBlock: { marginTop: 8 },
  previewLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 4 }
});
