import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { StarsDisplay } from "../components/StarRating";

export function ordersCountLabel(n) {
  const num = Number(n) || 0;
  const mod10 = num % 10;
  const mod100 = num % 100;
  if (mod10 === 1 && mod100 !== 11) return "заказ";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "заказа";
  return "заказов";
}

export function specialistSubtitle(specialist) {
  const parts = [];
  if (specialist?.position) parts.push(specialist.position);
  const done = specialist?.completed_orders_count ?? 0;
  parts.push(`выполнено ${done} ${ordersCountLabel(done)}`);
  return parts.join(" · ");
}

export function SpecialistPickerExtra({ specialist }) {
  const done = specialist?.completed_orders_count ?? 0;
  const hasRating = (specialist?.reviews_count ?? 0) > 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.orders}>Выполнено {done} {ordersCountLabel(done)}</Text>
      {hasRating ? (
        <View style={styles.ratingRow}>
          <StarsDisplay value={Math.round(specialist.rating_avg)} size={13} />
          <Text style={styles.ratingText}>
            {specialist.rating_avg?.toFixed(1)} · {specialist.reviews_count} отз.
          </Text>
        </View>
      ) : (
        <Text style={styles.noRating}>нет отзывов</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, gap: 2 },
  orders: { fontSize: 12, color: "#0f766e", fontWeight: "600" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { fontSize: 12, color: "#64748b" },
  noRating: { fontSize: 12, color: "#94a3b8" }
});
