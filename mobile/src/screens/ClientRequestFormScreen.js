import React, { useEffect, useState, useRef } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, Pressable } from "react-native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useRequestCart } from "../context/RequestCartContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { ButtonRow } from "../components/ButtonRow";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { SectionCard } from "../components/SectionCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { SearchablePicker } from "../components/SearchablePicker";
import { SpecialistPickerExtra, specialistSubtitle } from "../utils/specialistStats";
import { showFeedback } from "../utils/feedback";
import { confirmAction } from "../utils/confirm";
import { enterToSubmit } from "../utils/enterSubmit";
import { StatusBadge } from "../components/StatusBadge";
import { requestEditable } from "../utils/statusLabels";
import { commonStyles } from "../styles/common";
import { colors, space } from "../theme";

const EMPTY = {
  address: "",
  description: "",
  client_phone: "",
  visit_date: "",
  visit_time: "",
  estimated_cost: "",
  preferred_specialist_id: ""
};

function matchSpecialist(e, q) {
  return [e.full_name, e.position].some((v) => String(v || "").toLowerCase().includes(q));
}

export function ClientRequestFormScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const { token, profile } = useAuth();
  const { items: cartItems, clearCart } = useRequestCart();
  const [form, setForm] = useState(EMPTY);
  const formRef = useRef(EMPTY);
  const [specialists, setSpecialists] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedCatalog, setSelectedCatalog] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [requestStatus, setRequestStatus] = useState("new");
  const [proposal, setProposal] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleComment, setRescheduleComment] = useState("");
  const [rescheduleRequest, setRescheduleRequest] = useState(null);
  const [respondingProposal, setRespondingProposal] = useState(false);

  const patch = (p) => {
    setForm((prev) => {
      const next = { ...prev, ...p };
      formRef.current = next;
      return next;
    });
  };

  const catalogTotal = selectedCatalog.reduce((sum, s) => sum + s.price * s.quantity, 0);

  const toggleCatalogItem = (item) => {
    setSelectedCatalog((prev) => {
      const idx = prev.findIndex((s) => s.catalog_item_id === item.id);
      if (idx >= 0) return prev.filter((s) => s.catalog_item_id !== item.id);
      return [...prev, { catalog_item_id: item.id, title: item.title, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (catalogItemId, delta) => {
    setSelectedCatalog((prev) =>
      prev
        .map((s) => (s.catalog_item_id === catalogItemId ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s))
    );
  };

  useEffect(() => {
    if (!token) return;
    api.specialists(token).then(setSpecialists).catch(() => setSpecialists([]));
    api.catalog().then((data) => setCatalogItems(data.items || [])).catch(() => setCatalogItems([]));
  }, [token]);

  useEffect(() => {
    if (requestId || !profile) return;
    const hasDraft = route.params?.draft || route.params?.catalog_items?.length || cartItems.length;
    if (hasDraft) return;
    const next = {
      ...formRef.current,
      address: formRef.current.address || profile.address || "",
      client_phone: formRef.current.client_phone || profile.phone || ""
    };
    formRef.current = next;
    setForm(next);
  }, [requestId, profile, route.params?.draft, route.params?.catalog_items, cartItems.length]);

  useEffect(() => {
    const draft = route.params?.draft;
    const fromCart = route.params?.catalog_items;
    if (fromCart?.length && !requestId) {
      setSelectedCatalog(fromCart);
    } else if (draft && !requestId) {
      const next = { ...EMPTY, ...draft, preferred_specialist_id: draft.preferred_specialist_id ? String(draft.preferred_specialist_id) : "" };
      formRef.current = next;
      setForm(next);
    }
  }, [route.params?.draft, route.params?.catalog_items, requestId]);

  useEffect(() => {
    if (cartItems.length && !requestId && !route.params?.catalog_items) {
      setSelectedCatalog(cartItems.map((i) => ({ ...i })));
    }
  }, [cartItems, requestId, route.params?.catalog_items]);

  useEffect(() => {
    if (!requestId || !token) return;
    api
      .clientRequest(token, requestId)
      .then((data) => {
        const next = {
          address: data.address || "",
          description: data.description || "",
          client_phone: data.client_phone || "",
          visit_date: data.visit_date || "",
          visit_time: data.visit_time || "",
          estimated_cost: data.estimated_cost ? String(data.estimated_cost) : "",
          preferred_specialist_id: data.preferred_specialist_id ? String(data.preferred_specialist_id) : ""
        };
        formRef.current = next;
        setForm(next);
        setRequestStatus(data.status || "new");
        setProposal(data.proposal_status === "pending" ? { cost: data.proposal_cost, comment: data.proposal_comment } : null);
        setRescheduleRequest(data.reschedule_request || null);
        if (data.catalog_items?.length) {
          setSelectedCatalog(
            data.catalog_items.map((c) => ({
              catalog_item_id: c.catalog_item_id,
              title: c.title,
              price: c.price,
              quantity: c.quantity || 1
            }))
          );
        }
      })
      .catch((e) => setFeedback(e.message));
  }, [requestId, token]);

  useEffect(() => {
    if (selectedCatalog.length && !requestId) {
      patch({ estimated_cost: String(catalogTotal) });
    }
  }, [catalogTotal, selectedCatalog.length, requestId]);

  const cancelRequest = async () => {
    if (!requestId || !token || cancelling) return;
    if (!(await confirmAction("Вы уверены, что хотите отменить заявку?"))) return;
    setCancelling(true);
    try {
      await api.cancelClientRequest(token, requestId);
      showFeedback("Готово", "Заявка отменена");
      navigation.goBack();
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setCancelling(false);
    }
  };

  const respondProposal = async (accept) => {
    if (!requestId || respondingProposal) return;
    setRespondingProposal(true);
    try {
      await api.respondProposal(token, requestId, accept);
      setProposal(null);
      showFeedback("Готово", accept ? "Предложение принято" : "Предложение отклонено");
      const data = await api.clientRequest(token, requestId);
      setRequestStatus(data.status);
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setRespondingProposal(false);
    }
  };

  const submitReschedule = async () => {
    if (!requestId || !rescheduleDate.trim()) {
      setFeedback("Укажите новую дату для переноса");
      setFeedbackType("error");
      return;
    }
    setSaving(true);
    try {
      await api.requestReschedule(token, requestId, {
        visit_date: rescheduleDate.trim(),
        visit_time: rescheduleTime.trim(),
        comment: rescheduleComment.trim()
      });
      showFeedback("Отправлено", "Запрос на перенос отправлен администратору");
      const data = await api.clientRequest(token, requestId);
      setRescheduleRequest(data.reschedule_request);
      setRescheduleDate("");
      setRescheduleTime("");
      setRescheduleComment("");
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    const f = formRef.current;
    const address = String(f.address || "").trim();
    const description = String(f.description || "").trim();
    if (!address) {
      setFeedback("Укажите адрес");
      setFeedbackType("error");
      return;
    }
    if (!description) {
      setFeedback("Опишите, какие работы нужны");
      setFeedbackType("error");
      return;
    }

    const payload = {
      address,
      description,
      client_phone: f.client_phone || profile?.phone || "",
      visit_date: f.visit_date || "",
      visit_time: f.visit_time || "",
      estimated_cost: catalogTotal || (f.estimated_cost ? Number(f.estimated_cost) : null),
      preferred_specialist_id: f.preferred_specialist_id ? Number(f.preferred_specialist_id) : null,
      catalog_items: selectedCatalog.map((s) => ({ catalog_item_id: s.catalog_item_id, quantity: s.quantity }))
    };

    setSaving(true);
    try {
      if (requestId) {
        await api.updateClientRequest(token, requestId, payload);
        showFeedback("Сохранено", "Заявка обновлена");
      } else {
        await api.createClientRequest(token, payload);
        clearCart();
        showFeedback("Готово", "Заявка отправлена администратору");
      }
      navigation.goBack();
    } catch (e) {
      setFeedback(e.message);
      setFeedbackType("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={commonStyles.screen}>
      <ScrollView style={commonStyles.scroll} contentContainerStyle={commonStyles.formContent} keyboardShouldPersistTaps="handled">
        <FeedbackBanner message={feedback} type={feedbackType} />
        <View style={styles.titleRow}>
          <ScreenHeader
            title={requestId ? "Редактирование заявки" : "Новая заявка на выезд"}
            style={styles.headerFlex}
          />
          {!!requestId && <StatusBadge status={requestStatus} type="request" />}
        </View>

        {!!proposal && (
          <SectionCard tone="warning" title="Предложение администратора">
            <Text style={styles.proposalCost}>{proposal.cost} ₽</Text>
            {!!proposal.comment && <Text style={styles.muted}>{proposal.comment}</Text>}
            <ButtonRow>
              <ActionButton title="Принять" color={colors.success} size="sm" loading={respondingProposal} onPress={() => respondProposal(true)} />
              <ActionButton title="Отклонить" color={colors.danger} size="sm" loading={respondingProposal} onPress={() => respondProposal(false)} />
            </ButtonRow>
          </SectionCard>
        )}

        {!!requestId && rescheduleRequest?.status === "pending" && (
          <SectionCard tone="info" title="Запрос на перенос ожидает решения">
            <Text style={styles.muted}>Новая дата: {rescheduleRequest.visit_date} {rescheduleRequest.visit_time}</Text>
            {!!rescheduleRequest.comment && <Text style={styles.muted}>{rescheduleRequest.comment}</Text>}
          </SectionCard>
        )}

        <SearchablePicker
          label="Специалист"
          hint="Можно указать желаемого специалиста или оставить выбор администратору"
          placeholder="Выберите специалиста"
          searchPlaceholder="Поиск: имя, должность…"
          value={form.preferred_specialist_id}
          onChange={(id) => patch({ preferred_specialist_id: id })}
          items={specialists}
          emptyOption={{
            title: "Любой специалист",
            subtitle: "Назначит администратор"
          }}
          getItemSubtitle={specialistSubtitle}
          filterItem={matchSpecialist}
          renderItemExtra={(e) => <SpecialistPickerExtra specialist={e} />}
        />

        {catalogItems.length > 0 && (
          <SectionCard title="Позиции из каталога" subtitle="Выберите услуги — сумма подставится в бюджет">
            {catalogItems.map((item) => {
              const sel = selectedCatalog.find((s) => s.catalog_item_id === item.id);
              return (
                <View key={item.id} style={styles.catalogRow}>
                  <Pressable style={styles.catalogCheck} onPress={() => toggleCatalogItem(item)}>
                    <Text style={sel ? styles.checkOn : styles.checkOff}>{sel ? "✓" : "○"}</Text>
                    <View style={styles.catalogInfo}>
                      <Text style={styles.catalogTitle}>{item.title}</Text>
                      <Text style={styles.muted}>{item.price} ₽</Text>
                    </View>
                  </Pressable>
                  {sel && (
                    <View style={styles.qtyRow}>
                      <Pressable onPress={() => updateQty(item.id, -1)}><Text style={styles.qtyBtn}>−</Text></Pressable>
                      <Text style={styles.qtyVal}>{sel.quantity}</Text>
                      <Pressable onPress={() => updateQty(item.id, 1)}><Text style={styles.qtyBtn}>+</Text></Pressable>
                    </View>
                  )}
                </View>
              );
            })}
            {selectedCatalog.length > 0 && (
              <Text style={styles.total}>Итого по каталогу: {catalogTotal} ₽</Text>
            )}
          </SectionCard>
        )}

        <SectionCard title="Детали заявки">
          <Text style={commonStyles.fieldLabel}>Адрес *</Text>
          <TextInput style={commonStyles.input} placeholder="ул. Пример, 1, кв. 2" value={form.address} onChangeText={(v) => patch({ address: v })} />

          <Text style={commonStyles.fieldLabel}>Что нужно сделать *</Text>
          <TextInput style={[commonStyles.input, styles.tall]} multiline placeholder="Установка счетчиков, поверка..." value={form.description} onChangeText={(v) => patch({ description: v })} />

          <Text style={commonStyles.fieldLabel}>Телефон для связи</Text>
          <TextInput style={commonStyles.input} placeholder="+7 (900) 000-00-00" value={form.client_phone} onChangeText={(v) => patch({ client_phone: v })} keyboardType="phone-pad" />

          <Text style={commonStyles.fieldLabel}>Желаемая дата и время</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <TextInput style={[commonStyles.input, styles.inputInRow]} placeholder="2026-06-01" value={form.visit_date} onChangeText={(v) => patch({ visit_date: v })} />
            </View>
            <View style={styles.dateField}>
              <TextInput style={[commonStyles.input, styles.inputInRow]} placeholder="14:00" value={form.visit_time} onChangeText={(v) => patch({ visit_time: v })} />
            </View>
          </View>

          <Text style={commonStyles.fieldLabel}>Ориентировочный бюджет (₽)</Text>
          <TextInput
            style={commonStyles.input}
            placeholder="3000"
            keyboardType="numeric"
            value={form.estimated_cost}
            onChangeText={(v) => patch({ estimated_cost: v })}
            {...enterToSubmit(submit)}
          />
        </SectionCard>

        {!!requestId && ["new", "negotiating", "confirmed"].includes(requestStatus) && !rescheduleRequest?.status?.match(/pending|approved/) && (
          <SectionCard
            title="Запрос на перенос даты"
            tone="info"
            subtitle={
              form.visit_date
                ? `Сейчас: ${form.visit_date}${form.visit_time ? ` · ${form.visit_time}` : ""}`
                : "Укажите новую дату — администратор подтвердит"
            }
          >
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={commonStyles.fieldLabel}>Новая дата</Text>
                <TextInput
                  style={commonStyles.input}
                  placeholder="2026-06-15"
                  value={rescheduleDate}
                  onChangeText={setRescheduleDate}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={commonStyles.fieldLabel}>Время</Text>
                <TextInput
                  style={commonStyles.input}
                  placeholder="14:00"
                  value={rescheduleTime}
                  onChangeText={setRescheduleTime}
                />
              </View>
            </View>

            <Text style={commonStyles.fieldLabel}>Комментарий</Text>
            <TextInput
              style={[commonStyles.input, styles.tall]}
              placeholder="Причина переноса (необязательно)"
              value={rescheduleComment}
              onChangeText={setRescheduleComment}
              multiline
            />

            <ActionButton title="Отправить запрос" size="sm" loading={saving} onPress={submitReschedule} />
          </SectionCard>
        )}
      </ScrollView>
      <BottomActions>
        <ActionButton title={requestId ? "Сохранить" : "Отправить"} loading={saving} onPress={submit} />
        {!!requestId && requestEditable(requestStatus) && (
          <ActionButton title="Отменить заявку" color={colors.danger} loading={cancelling} onPress={cancelRequest} />
        )}
      </BottomActions>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: space.sm, marginBottom: space.sm },
  headerFlex: { flex: 1, marginBottom: 0 },
  proposalCost: { fontSize: 22, fontWeight: "700", color: colors.warning, marginBottom: 4 },
  muted: { color: colors.textMuted, fontSize: 13 },
  tall: { minHeight: 100, textAlignVertical: "top" },
  inputInRow: { marginBottom: 0 },
  dateRow: { flexDirection: "row", gap: space.sm },
  dateField: { flex: 1 },
  catalogRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight
  },
  catalogCheck: { flexDirection: "row", alignItems: "center", gap: space.sm, flex: 1 },
  checkOn: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  checkOff: { fontSize: 18, color: colors.textSubtle },
  catalogInfo: { flex: 1 },
  catalogTitle: { fontWeight: "600", color: colors.text },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  qtyBtn: { fontSize: 20, fontWeight: "700", color: colors.primary, paddingHorizontal: space.sm },
  qtyVal: { fontWeight: "700", minWidth: 24, textAlign: "center" },
  total: { fontWeight: "700", fontSize: 14, color: "#0f766e", marginTop: space.sm }
});
