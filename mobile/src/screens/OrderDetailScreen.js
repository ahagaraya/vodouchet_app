import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Switch, TextInput, Pressable, RefreshControl, Platform } from "react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { RefreshButton } from "../components/RefreshButton";
import { showFeedback } from "../utils/feedback";
import { OrderChatBlock } from "../components/OrderChatBlock";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { commonStyles } from "../styles/common";
import { colors, radius, space } from "../theme";

const PAYMENT_OPTIONS = [
  { value: "pending", label: "Не оплачено" },
  { value: "paid", label: "Оплачено" },
  { value: "partial", label: "Частично" },
  { value: "other", label: "Другое" }
];

const FAILURE_OPTIONS = [
  { value: "no_access", label: "Нет доступа" },
  { value: "defect", label: "Брак / дефект" },
  { value: "client_absent", label: "Клиент отсутствует" },
  { value: "other", label: "Другое" }
];

const STATUS_LABELS = { published: "Назначен", in_progress: "В работе", completed: "Выполнен" };

export function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentNote, setPaymentNote] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [failureNote, setFailureNote] = useState("");
  const [extraTitle, setExtraTitle] = useState("");
  const [extraCost, setExtraCost] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");

  const applyOrder = (data) => {
    setOrder(data);
    setPaymentStatus(data.payment_status || "pending");
    setPaymentNote(data.payment_note || "");
    setServiceNote(data.service_note || "");
    setFailureReason(data.failure_reason || "");
    setFailureNote(data.failure_note || "");
  };

  const load = useCallback(async () => {
    if (!token) throw new Error("Войдите в аккаунт для просмотра выезда");
    const data = await api.order(token, orderId);
    applyOrder(data);
  }, [token, orderId]);

  useEffect(() => {
    load().catch((e) => {
      setFeedback(e.message);
      setFeedbackType("error");
    });
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      setFeedback("Данные обновлены");
      setFeedbackType("success");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setRefreshing(false);
    }
  };

  const toggleWork = (workId) => {
    setOrder((prev) => ({
      ...prev,
      works: prev.works.map((w) => (w.id === workId ? { ...w, completed: !w.completed } : w))
    }));
  };

  const save = async (newStatus) => {
    if (!token) {
      setFeedback("Сессия истекла — войдите снова");
      setFeedbackType("error");
      return;
    }
    if (!order) return;

    try {
      setSaving(true);
      setFeedback("");
      const result = await api.reportOrder(token, orderId, {
        works: order.works,
        payment_status: paymentStatus,
        payment_note: paymentNote,
        service_note: serviceNote,
        status: newStatus || order.status,
        failure_reason: failureReason || null,
        failure_note: failureNote || null
      });
      applyOrder(result.order);
      const msg =
        newStatus === "in_progress"
          ? "Статус: в работе"
          : newStatus === "completed"
            ? "Выезд завершён"
            : "Изменения сохранены";
      setFeedback(msg);
      setFeedbackType("success");
      showFeedback("Сохранено", msg);
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setSaving(false);
    }
  };

  const addExtraWork = async () => {
    if (!extraTitle.trim() || !extraCost) {
      setFeedback("Укажите описание и стоимость доп. работ");
      setFeedbackType("error");
      return;
    }
    setAddingExtra(true);
    try {
      const res = await api.addExtraWork(token, orderId, { title: extraTitle.trim(), cost: Number(extraCost) });
      applyOrder(res.order);
      setExtraTitle("");
      setExtraCost("");
      setFeedback("Доп. работы отправлены клиенту на согласование");
      setFeedbackType("success");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setAddingExtra(false);
    }
  };

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>{feedback || "Загрузка..."}</Text>
      </View>
    );
  }

  const allDone = order.works.every((w) => w.completed);

  return (
    <View style={commonStyles.screen}>
      <ScrollView
        style={commonStyles.scroll}
        contentContainerStyle={commonStyles.formContent}
        refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <RefreshButton onPress={onRefresh} loading={refreshing} />
        <FeedbackBanner message={feedback} type={feedbackType} />
        <ScreenHeader title={`Выезд #${order.id}`} subtitle={`Статус: ${STATUS_LABELS[order.status] || order.status}`} />

        <SectionCard title="Объект">
          <Text style={commonStyles.fieldLabel}>Адрес</Text>
          <Text style={styles.value}>{order.address}</Text>
          <Text style={commonStyles.fieldLabel}>Дата и время</Text>
          <Text style={styles.value}>{order.visit_date} · {order.visit_time}</Text>
          <Text style={commonStyles.fieldLabel}>Ориентировочная стоимость</Text>
          <Text style={styles.value}>{order.estimated_cost} ₽</Text>
        </SectionCard>

        <SectionCard title="Контакт на объекте">
          <Text style={styles.value}>{order.contact_name}</Text>
          <Text style={styles.value}>{order.contact_phone}</Text>
          {!!order.client_comments && (
            <>
              <Text style={commonStyles.fieldLabel}>Пожелания клиента</Text>
              <Text style={styles.comment}>{order.client_comments}</Text>
            </>
          )}
        </SectionCard>

        <SectionCard title="Перечень работ">
          {order.works.map((w) => (
            <View key={w.id} style={styles.workRow}>
              <Text style={[styles.workText, w.completed && styles.workDone]}>{w.title}</Text>
              <Switch value={!!w.completed} onValueChange={() => toggleWork(w.id)} />
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Оплата">
          <View style={styles.chips}>
            {PAYMENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.chip, paymentStatus === opt.value && styles.chipActive]}
                onPress={() => setPaymentStatus(opt.value)}
              >
                <Text style={[styles.chipText, paymentStatus === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={commonStyles.input}
            placeholder="Комментарий по оплате"
            value={paymentNote}
            onChangeText={setPaymentNote}
          />
        </SectionCard>

        <SectionCard title="Служебная отметка">
          <TextInput
            style={[commonStyles.input, styles.multiline]}
            multiline
            placeholder="Любая служебная информация"
            value={serviceNote}
            onChangeText={setServiceNote}
          />
        </SectionCard>

        {order.status !== "completed" && (
          <SectionCard title="Не удалось выполнить">
            <Text style={styles.hintBlock}>Укажите причину, если выезд не может быть завершён</Text>
            <View style={styles.chips}>
              {FAILURE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, failureReason === opt.value && styles.chipActive]}
                  onPress={() => setFailureReason(failureReason === opt.value ? "" : opt.value)}
                >
                  <Text style={[styles.chipText, failureReason === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
            {!!failureReason && (
              <TextInput
                style={[commonStyles.input, styles.multiline]}
                multiline
                placeholder="Пояснение"
                value={failureNote}
                onChangeText={setFailureNote}
              />
            )}
          </SectionCard>
        )}

        {order.status === "in_progress" && (
          <SectionCard title="Доп. работы на объекте">
            <TextInput style={commonStyles.input} placeholder="Описание работ" value={extraTitle} onChangeText={setExtraTitle} />
            <TextInput style={commonStyles.input} placeholder="Стоимость (₽)" keyboardType="numeric" value={extraCost} onChangeText={setExtraCost} />
            <ActionButton title="Отправить клиенту" size="sm" loading={addingExtra} onPress={addExtraWork} />
            {(order.extra_works || []).length > 0 && (
              <View style={styles.extraList}>
                {(order.extra_works || []).map((w) => (
                  <Text key={w.id} style={styles.extraItem}>
                    {w.title} — {w.cost} ₽ ({w.status === "pending" ? "ожидает" : w.status === "approved" ? "согласовано" : "отклонено"})
                  </Text>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {order.status !== "completed" && !allDone && (
          <Text style={styles.hint}>Чтобы завершить выезд, отметьте все работы переключателями справа</Text>
        )}
        <SectionCard title="Чат по заказу" subtitle="Переписка с администратором и участниками по этому выезду">
          <OrderChatBlock orderId={orderId} embedded />
        </SectionCard>

        {Platform.OS === "web" && <Text style={styles.hint}>На web: нажмите «↻ Обновить» или прокрутите колёсиком мыши</Text>}
      </ScrollView>

      <BottomActions>
        {order.status !== "completed" && (
          <>
            {order.status === "published" && (
              <ActionButton title="Начать работу" loading={saving} onPress={() => save("in_progress")} />
            )}
            {order.status === "in_progress" && (
              <ActionButton title="Сохранить прогресс" variant="secondary" loading={saving} onPress={() => save("in_progress")} />
            )}
            <ActionButton
              title="Завершить"
              color={colors.success}
              loading={saving}
              disabled={!allDone}
              onPress={() => save("completed")}
            />
          </>
        )}
        {order.status === "completed" && (
          <ActionButton title="Сохранить изменения" loading={saving} onPress={() => save("completed")} />
        )}
      </BottomActions>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: space.lg, backgroundColor: colors.bg },
  value: { fontSize: 16, marginBottom: space.sm, color: colors.text },
  comment: { fontSize: 15, fontStyle: "italic", color: colors.textSecondary, lineHeight: 22 },
  workRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  workText: { flex: 1, fontSize: 15, paddingRight: space.sm, color: colors.text },
  workDone: { textDecorationLine: "line-through", color: colors.textSubtle },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextActive: { color: colors.primaryDark, fontWeight: "600" },
  input: { marginTop: 0 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: space.sm, textAlign: "center" },
  hintBlock: { fontSize: 12, color: colors.textMuted, marginBottom: space.sm },
  extraList: { marginTop: space.md },
  extraItem: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 }
});
