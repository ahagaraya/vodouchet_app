import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, Platform, Modal, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { ButtonRow } from "../components/ButtonRow";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { StatusBadge } from "../components/StatusBadge";
import { OrderTimeline } from "../components/OrderTimeline";
import { showFeedback } from "../utils/feedback";
import { confirmAction } from "../utils/confirm";
import { normalizeStatus, orderCancellable, orderEditable } from "../utils/statusLabels";
import { OrderChatBlock } from "../components/OrderChatBlock";
import { openReviewFromChat } from "../utils/chatActions";
import { commonStyles } from "../styles/common";
import { colors, radius, shadow, space } from "../theme";

const EMPTY = {
  address: "",
  works: "",
  client_comments: "",
  contact_phone: "",
  visit_date: "",
  visit_time: "",
  estimated_cost: ""
};

const WEB_BOTTOM_PAD = Platform.OS === "web" ? 100 : 24;

export function ClientOrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const { token, profile } = useAuth();
  const navigation = useNavigation();
  const [order, setOrder] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const formRef = useRef(EMPTY);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintBody, setComplaintBody] = useState("");
  const [complaintSaving, setComplaintSaving] = useState(false);
  const [extraBusy, setExtraBusy] = useState(null);

  const patch = (p) => {
    setForm((prev) => {
      const next = { ...prev, ...p };
      formRef.current = next;
      return next;
    });
  };

  const fillForm = (o) => {
    const next = {
      address: o.address || "",
      works: (o.works || []).map((w) => (typeof w === "string" ? w : w.title)).join("\n"),
      client_comments: o.client_comments || "",
      contact_phone: o.contact_phone || profile?.phone || "",
      visit_date: o.visit_date || "",
      visit_time: o.visit_time || "",
      estimated_cost: o.estimated_cost != null ? String(o.estimated_cost) : ""
    };
    formRef.current = next;
    setForm(next);
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const o = await api.clientOrder(token, orderId);
      setOrder(o);
      fillForm(o);
      setFeedback("");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [token, orderId, profile?.phone]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const save = async () => {
    if (saving || !token || !order) return;
    const f = formRef.current;
    const address = String(f.address || "").trim();
    if (!address) {
      setFeedback("Укажите адрес");
      setFeedbackType("error");
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateClientOrder(token, orderId, {
        address,
        client_comments: f.client_comments || "",
        contact_phone: f.contact_phone || "",
        visit_date: f.visit_date || "",
        visit_time: f.visit_time || "",
        estimated_cost: f.estimated_cost ? Number(f.estimated_cost) : 0,
        works: String(f.works || "").split("\n").filter(Boolean)
      });
      setOrder(res.order);
      fillForm(res.order);
      showFeedback("Сохранено", "Изменения отправлены");
      setFeedback("Изменения сохранены", "success");
      setFeedbackType("success");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async () => {
    if (cancelling || !token || !order) return;
    if (!(await confirmAction("Отменить заказ? Специалист получит уведомление об отмене."))) return;

    setCancelling(true);
    try {
      await api.cancelClientOrder(token, orderId);
      showFeedback("Готово", "Заказ отменён");
      await load();
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setCancelling(false);
    }
  };

  const respondExtraWork = async (workId, accept) => {
    setExtraBusy(workId);
    try {
      const res = await api.respondExtraWork(token, orderId, workId, accept);
      setOrder(res.order);
      showFeedback("Готово", accept ? "Доп. работы согласованы" : "Доп. работы отклонены");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setExtraBusy(null);
    }
  };

  const submitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintBody.trim()) {
      setFeedback("Укажите тему и текст претензии");
      setFeedbackType("error");
      return;
    }
    setComplaintSaving(true);
    try {
      await api.createComplaint(token, {
        subject: complaintSubject.trim(),
        body: complaintBody.trim(),
        order_id: orderId
      });
      setComplaintOpen(false);
      setComplaintSubject("");
      setComplaintBody("");
      showFeedback("Отправлено", "Претензия зарегистрирована");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setComplaintSaving(false);
    }
  };

  if (!order && loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Загрузка…</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <FeedbackBanner message={feedback} type={feedbackType} />
        <Text style={styles.muted}>Не удалось открыть заказ. Обновите список и попробуйте снова.</Text>
      </View>
    );
  }

  const status = normalizeStatus(order.status);
  const canEdit = orderEditable(status);
  const canCancel = orderCancellable(status);
  const pendingExtra = (order.extra_works || []).filter((w) => w.status === "pending");

  return (
    <View style={commonStyles.screen}>
      <ScrollView
        style={commonStyles.scroll}
        contentContainerStyle={[commonStyles.formContent, { paddingBottom: WEB_BOTTOM_PAD }]}
        keyboardShouldPersistTaps="handled"
      >
        <FeedbackBanner message={feedback} type={feedbackType} />
        <View style={styles.titleRow}>
          <ScreenHeader title={`Заказ #${order.id}`} style={styles.headerFlex} />
          <StatusBadge status={status} type="order" />
        </View>

        {!!order.specialist_name && (
          <Text style={styles.muted}>Специалист: {order.specialist_name}</Text>
        )}

        {!!order.timeline?.length && (
          <SectionCard title="Ход выполнения">
            <OrderTimeline timeline={order.timeline} />
          </SectionCard>
        )}

        {pendingExtra.length > 0 && (
          <SectionCard title="Доп. работы — требуется согласование" tone="warning">
            {pendingExtra.map((work) => (
              <View key={work.id} style={styles.extraCard}>
                <Text style={styles.extraTitle}>{work.title}</Text>
                <Text style={styles.muted}>{work.cost} ₽{work.note ? ` · ${work.note}` : ""}</Text>
                <ButtonRow>
                  <ActionButton title="Согласовать" color={colors.success} size="sm" loading={extraBusy === work.id} onPress={() => respondExtraWork(work.id, true)} />
                  <ActionButton title="Отклонить" color={colors.danger} size="sm" loading={extraBusy === work.id} onPress={() => respondExtraWork(work.id, false)} />
                </ButtonRow>
              </View>
            ))}
          </SectionCard>
        )}

        {canEdit ? (
          <SectionCard title="Данные заказа">
            <Text style={commonStyles.fieldLabel}>Адрес *</Text>
            <TextInput style={commonStyles.input} value={form.address} onChangeText={(v) => patch({ address: v })} />

            <Text style={commonStyles.fieldLabel}>Работы (каждая с новой строки)</Text>
            <TextInput style={[commonStyles.input, styles.tall]} multiline value={form.works} onChangeText={(v) => patch({ works: v })} />

            <Text style={commonStyles.fieldLabel}>Комментарий</Text>
            <TextInput style={[commonStyles.input, styles.tall]} multiline value={form.client_comments} onChangeText={(v) => patch({ client_comments: v })} />

            <Text style={commonStyles.fieldLabel}>Телефон</Text>
            <TextInput style={commonStyles.input} value={form.contact_phone} onChangeText={(v) => patch({ contact_phone: v })} keyboardType="phone-pad" />

            <Text style={commonStyles.fieldLabel}>Дата и время выезда</Text>
            <View style={styles.dateRow}>
              <TextInput style={[commonStyles.input, styles.dateField]} placeholder="2026-06-01" value={form.visit_date} onChangeText={(v) => patch({ visit_date: v })} />
              <TextInput style={[commonStyles.input, styles.dateField]} placeholder="14:00" value={form.visit_time} onChangeText={(v) => patch({ visit_time: v })} />
            </View>

            <Text style={commonStyles.fieldLabel}>Ориентировочная стоимость (₽)</Text>
            <TextInput style={commonStyles.input} keyboardType="numeric" value={form.estimated_cost} onChangeText={(v) => patch({ estimated_cost: v })} />
          </SectionCard>
        ) : (
          <SectionCard title="Данные заказа">
            <Text style={commonStyles.fieldLabel}>Адрес</Text>
            <Text style={styles.value}>{order.address}</Text>
            <Text style={commonStyles.fieldLabel}>Дата и время</Text>
            <Text style={styles.value}>
              {order.visit_date || "—"} {order.visit_time || ""}
            </Text>
            <Text style={commonStyles.fieldLabel}>Стоимость</Text>
            <Text style={styles.value}>~{order.estimated_cost} ₽</Text>
            {!!order.client_comments && (
              <>
                <Text style={commonStyles.fieldLabel}>Комментарий</Text>
                <Text style={styles.value}>{order.client_comments}</Text>
              </>
            )}
            <Text style={styles.readonlyHint}>Редактирование недоступно для этого статуса заказа</Text>
          </SectionCard>
        )}

        {status === "completed" && profile?.role === "client" && (
          <SectionCard tone="success" title="Работы завершены" subtitle="Пожалуйста, оцените работу специалиста — это поможет другим клиентам.">
            <ActionButton
              title="Оставить отзыв"
              color={colors.success}
              size="sm"
              onPress={() => openReviewFromChat(navigation, order.id)}
            />
          </SectionCard>
        )}

        <SectionCard title="Чат по заказу" subtitle="Переписка с администратором и участниками по этому выезду">
          <OrderChatBlock orderId={orderId} navigation={navigation} embedded />
        </SectionCard>
      </ScrollView>

      <BottomActions>
        {canEdit && <ActionButton title="Сохранить" loading={saving} onPress={save} />}
        {canCancel && (
          <ActionButton title="Отменить заказ" color={colors.danger} loading={cancelling} onPress={cancelOrder} />
        )}
        <ActionButton title="Претензия" variant="secondary" size="sm" onPress={() => setComplaintOpen(true)} />
      </BottomActions>

      <Modal visible={complaintOpen} transparent animationType="fade" onRequestClose={() => setComplaintOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setComplaintOpen(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.modalTitle}>Претензия по заказу #{orderId}</Text>
            <TextInput style={commonStyles.input} placeholder="Тема" value={complaintSubject} onChangeText={setComplaintSubject} />
            <TextInput style={[commonStyles.input, styles.tall]} multiline placeholder="Опишите проблему" value={complaintBody} onChangeText={setComplaintBody} />
            <ButtonRow style={styles.modalActions}>
              <ActionButton title="Отправить" loading={complaintSaving} onPress={submitComplaint} />
              <ActionButton title="Отмена" variant="secondary" onPress={() => setComplaintOpen(false)} />
            </ButtonRow>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", padding: space.lg, backgroundColor: colors.bg },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.sm, marginBottom: space.sm },
  headerFlex: { flex: 1, marginBottom: 0 },
  tall: { minHeight: 80, textAlignVertical: "top" },
  dateRow: { flexDirection: "row", gap: space.sm },
  dateField: { flex: 1, marginBottom: 0 },
  value: { fontSize: 16, color: colors.text, marginBottom: space.sm },
  muted: { color: colors.textMuted, fontSize: 13, marginBottom: space.sm },
  readonlyHint: { color: colors.textSubtle, fontSize: 13, marginTop: space.sm, fontStyle: "italic" },
  extraCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  extraTitle: { fontWeight: "700", marginBottom: 4, color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: space.lg },
  modalBox: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, ...shadow.card },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: space.md, color: colors.text },
  modalActions: { marginTop: space.md }
});
