import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  RefreshControl,
  Platform
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { FormActionBar } from "../components/FormActionBar";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { RefreshButton } from "../components/RefreshButton";
import { StatusBadge } from "../components/StatusBadge";
import { showFeedback } from "../utils/feedback";
import { AdminChatsPanel } from "./AdminChatsPanel";
import { AdminSearchPanel } from "./AdminSearchPanel";
import { AdminClientsPanel } from "./AdminClientsPanel";
import { AdminDashboardPanel } from "./AdminDashboardPanel";
import { AdminReportsPanel } from "./AdminReportsPanel";
import { AdminCatalogPanel } from "./AdminCatalogPanel";
import { AdminAuditPanel } from "./AdminAuditPanel";
import { AdminComplaintsPanel } from "./AdminComplaintsPanel";
import { OrderChatBlock } from "../components/OrderChatBlock";
import { ButtonRow } from "../components/ButtonRow";
import { SearchablePicker } from "../components/SearchablePicker";
import { SpecialistPickerExtra, specialistSubtitle } from "../utils/specialistStats";
import { CatalogPickerPanel } from "../components/CatalogPickerPanel";
import {
  catalogItemsToSelection,
  catalogSelectionToWorks,
  catalogSelectionTotal,
  selectionToApiPayload
} from "../utils/catalogSelection";
import { colors, radius, shadow, space } from "../theme";
import { ListSortChips } from "../components/ListSortChips";
import { sortOrders, sortRequests } from "../utils/listSort";

const SOURCE_LABELS = { website: "Сайт", telegram: "Telegram", app: "Приложение" };

function matchQuery(fields, q) {
  return fields.some((v) => String(v || "").toLowerCase().includes(q));
}

function worksFromRequest(reqItem) {
  const catalog = reqItem.catalog_items || [];
  if (catalog.length) return catalogSelectionToWorks(catalogItemsToSelection(catalog));
  const desc = String(reqItem.description || "").trim();
  if (desc) return desc;
  return "Установка счетчика\nОформление акта";
}

function syncCatalogToForm(selected) {
  const patch = { selected_catalog: selected };
  if (selected.length) {
    patch.works = catalogSelectionToWorks(selected);
    patch.estimated_cost = String(catalogSelectionTotal(selected));
  }
  return patch;
}

const ORDER_STATUSES = [
  { key: "draft", label: "Черновик" },
  { key: "published", label: "У специалиста" },
  { key: "in_progress", label: "В работе" },
  { key: "completed", label: "Выполнен" },
  { key: "cancelled", label: "Отменён" }
];

const EMPTY_FORM = {
  client_user_id: "",
  assigned_user_id: "",
  address: "",
  works: "Установка счетчика\nОформление акта",
  estimated_cost: "1800",
  contact_name: "",
  contact_phone: "",
  client_comments: "",
  visit_date: "2026-05-07",
  visit_time: "12:00",
  request_id: null,
  selected_catalog: [],
  preferred_specialist_name: "",
  status: "draft"
};

export function AdminScreen({ navigation }) {
  const { token } = useAuth();
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [clients, setClients] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [chatUnread, setChatUnread] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackType, setFeedbackType] = useState("info");
  const [saving, setSaving] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [proposalForms, setProposalForms] = useState({});
  const [proposalSaving, setProposalSaving] = useState(null);
  const [rescheduleSaving, setRescheduleSaving] = useState(null);
  const [requestSortBy, setRequestSortBy] = useState("new");
  const [orderSortBy, setOrderSortBy] = useState("new");
  const formRef = useRef(EMPTY_FORM);

  const sortedRequests = useMemo(() => sortRequests(requests, requestSortBy), [requests, requestSortBy]);
  const sortedOrders = useMemo(() => sortOrders(orders, orderSortBy), [orders, orderSortBy]);

  const setFormSync = (next) => {
    formRef.current = next;
    setForm(next);
  };

  const patchForm = (patch) => {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      formRef.current = next;
      return next;
    });
  };

  const resetCreateForm = () => {
    setEditingOrderId(null);
    setFormSync({ ...EMPTY_FORM });
  };

  const showMsg = (text, type = "info") => {
    setFeedback(text);
    setFeedbackType(type);
  };

  const loadInboxUnread = useCallback(async () => {
    if (!token) return;
    try {
      const inbox = await api.adminChatInbox(token);
      setChatUnread(inbox.unread_total || 0);
    } catch {
      /* ignore polling errors */
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!token) return;
    const [req, ord, emp, cls, catalog] = await Promise.all([
      api.adminRequests(token),
      api.adminOrders(token),
      api.adminEmployees(token),
      api.adminClients(token),
      api.catalog()
    ]);
    setRequests(req);
    setOrders(ord);
    setEmployees(emp);
    setClients(cls);
    setCatalogItems(catalog.items || []);
    await loadInboxUnread();
  }, [token, loadInboxUnread]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => showMsg(e.message, "error"));
      const t = setInterval(loadInboxUnread, 15000);
      return () => clearInterval(t);
    }, [load, loadInboxUnread])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      showMsg("Данные обновлены", "success");
    } catch (e) {
      showMsg(e.message, "error");
    } finally {
      setRefreshing(false);
    }
  };

  const applyClientProfile = (client, base = formRef.current) => {
    if (!client) return {};
    return {
      contact_name: client.full_name || base.contact_name || "",
      contact_phone: client.phone || base.contact_phone || "",
      address: base.address || client.address || ""
    };
  };

  const openRequestForm = (reqItem, mode = "order") => {
    if (mode === "order" && !employees.length) {
      showMsg("Нет сотрудников для назначения", "error");
      return;
    }
    setEditingOrderId(null);
    const catalogSelection = catalogItemsToSelection(reqItem.catalog_items || []);
    const cost =
      reqItem.proposal_status === "accepted" && reqItem.proposal_cost != null
        ? reqItem.proposal_cost
        : reqItem.estimated_cost;
    const next = {
      ...EMPTY_FORM,
      address: reqItem.address || "",
      works: worksFromRequest(reqItem),
      contact_name: reqItem.client_name || "",
      contact_phone: reqItem.client_phone || "",
      client_comments: reqItem.description || "",
      visit_date: reqItem.visit_date || EMPTY_FORM.visit_date,
      visit_time: reqItem.visit_time || EMPTY_FORM.visit_time,
      estimated_cost: cost != null ? String(cost) : EMPTY_FORM.estimated_cost,
      request_id: reqItem.id,
      selected_catalog: catalogSelection,
      preferred_specialist_name: reqItem.preferred_specialist_name || "",
      client_user_id: reqItem.client_user_id ? String(reqItem.client_user_id) : "",
      assigned_user_id: reqItem.preferred_specialist_id ? String(reqItem.preferred_specialist_id) : ""
    };
    if (next.client_user_id) {
      const client = clients.find((c) => String(c.id) === String(next.client_user_id));
      Object.assign(next, applyClientProfile(client, next));
    }
    if (catalogSelection.length) {
      Object.assign(next, syncCatalogToForm(catalogSelection));
      if (cost != null) next.estimated_cost = String(cost);
    }
    setFormSync(next);
    setTab("create");
    showMsg(
      mode === "edit"
        ? "Исправьте данные заявки и нажмите «Сохранить правки в заявке»"
        : "Проверьте данные, при необходимости исправьте и опубликуйте заказ",
      "info"
    );
  };

  const publishFromRequest = (reqItem) => openRequestForm(reqItem, "order");

  const toggleCatalogItem = (item) => {
    const current = formRef.current.selected_catalog || [];
    const idx = current.findIndex((s) => s.catalog_item_id === item.id);
    const selected =
      idx >= 0
        ? current.filter((s) => s.catalog_item_id !== item.id)
        : [...current, { catalog_item_id: item.id, title: item.title, price: item.price, quantity: 1 }];
    patchForm(syncCatalogToForm(selected));
  };

  const updateCatalogQty = (catalogItemId, delta) => {
    const current = formRef.current.selected_catalog || [];
    const selected = current
      .map((s) =>
        s.catalog_item_id === catalogItemId ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s
      );
    patchForm(syncCatalogToForm(selected));
  };

  const saveRequestEdits = async () => {
    const f = formRef.current;
    if (!f.request_id || !token) return;
    const address = String(f.address || "").trim();
    if (!address) {
      showMsg("Укажите адрес", "error");
      return;
    }
    setSavingRequest(true);
    try {
      const payload = {
        address,
        description: f.client_comments || "",
        client_phone: f.contact_phone || "",
        client_name: f.contact_name || "",
        visit_date: f.visit_date || "",
        visit_time: f.visit_time || "",
        catalog_items: selectionToApiPayload(f.selected_catalog),
        preferred_specialist_id: f.assigned_user_id ? Number(f.assigned_user_id) : null
      };
      if (!f.selected_catalog?.length && f.estimated_cost) {
        payload.estimated_cost = Number(f.estimated_cost);
      }
      const res = await api.adminUpdateRequest(token, f.request_id, payload);
      showMsg("Заявка клиента обновлена", "success");
      showFeedback("Сохранено", "Правки в заявке сохранены");
      if (res.request) {
        patchForm({
          selected_catalog: catalogItemsToSelection(res.request.catalog_items),
          estimated_cost: res.request.estimated_cost != null ? String(res.request.estimated_cost) : f.estimated_cost,
          preferred_specialist_name: res.request.preferred_specialist_name || ""
        });
      }
      await load();
    } catch (e) {
      showMsg(e.message, "error");
    } finally {
      setSavingRequest(false);
    }
  };

  const openEditOrder = (order) => {
    setEditingOrderId(order.id);
    setFormSync({
      client_user_id: order.client_user_id ? String(order.client_user_id) : "",
      assigned_user_id: String(order.assigned_user_id || ""),
      address: order.address || "",
      works: (order.works || []).map((w) => (typeof w === "string" ? w : w.title)).join("\n"),
      estimated_cost: String(order.estimated_cost ?? ""),
      contact_name: order.contact_name || "",
      contact_phone: order.contact_phone || "",
      client_comments: order.client_comments || "",
      visit_date: order.visit_date || "",
      visit_time: order.visit_time || "",
      request_id: order.request_id || null,
      selected_catalog: [],
      preferred_specialist_name: "",
      status: order.status || "draft"
    });
    setTab("create");
  };

  const buildOrderPayload = (f, extra = {}) => {
    const address = String(f.address || "").trim();
    const specialistId = Number(f.assigned_user_id);
    return {
      client_user_id: f.client_user_id ? Number(f.client_user_id) : null,
      assigned_user_id: specialistId,
      address,
      works: String(f.works || "").split("\n").filter(Boolean),
      estimated_cost: Number(f.estimated_cost) || 0,
      contact_name: f.contact_name || "",
      contact_phone: f.contact_phone || "",
      client_comments: f.client_comments || "",
      visit_date: f.visit_date || "",
      visit_time: f.visit_time || "",
      status: f.status || "draft",
      ...extra
    };
  };

  const validateForm = (f) => {
    const address = String(f.address || "").trim();
    const specialistId = Number(f.assigned_user_id);
    if (!address) {
      showMsg("Укажите адрес выезда", "error");
      return null;
    }
    if (!specialistId || Number.isNaN(specialistId)) {
      showMsg("Выберите специалиста (нажмите на карточку)", "error");
      return null;
    }
    if (!token) {
      showMsg("Сессия истекла — войдите снова", "error");
      return null;
    }
    return { address, specialistId };
  };

  const selectClient = (id, item) => {
    if (!id) {
      patchForm({ client_user_id: "" });
      return;
    }
    patchForm({
      client_user_id: id,
      ...applyClientProfile(item)
    });
  };

  const saveOrder = async (publish) => {
    if (saving) return;
    const f = formRef.current;
    const valid = validateForm(f);
    if (!valid) return;

    setSaving(true);
    try {
      if (editingOrderId) {
        const payload = buildOrderPayload(f, publish ? { status: "published" } : {});
        await api.updateOrder(token, editingOrderId, payload);
        const msg = publish ? "Заказ опубликован специалисту" : "Заказ сохранён";
        showMsg(msg, "success");
        showFeedback("Готово", msg);
        resetCreateForm();
        setTab("orders");
      } else {
        const payload = {
          request_id: f.request_id,
          ...buildOrderPayload(f),
          publish: !!publish
        };
        delete payload.status;
        await api.createOrder(token, payload);
        const msg = publish ? "Заказ опубликован специалисту" : "Черновик сохранён";
        showMsg(msg, "success");
        showFeedback("Готово", msg);
        resetCreateForm();
        setTab("orders");
      }
      await load();
    } catch (e) {
      showMsg(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const publishOrderQuick = async (orderId) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.updateOrder(token, orderId, { status: "published" });
      showMsg("Заказ опубликован", "success");
      showFeedback("Готово", "Заказ отправлен специалисту");
      await load();
    } catch (e) {
      showMsg(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const patchProposalForm = (reqId, patch) => {
    setProposalForms((prev) => ({
      ...prev,
      [reqId]: { cost: "", comment: "", ...(prev[reqId] || {}), ...patch }
    }));
  };

  const sendProposal = async (reqId) => {
    const f = proposalForms[reqId] || {};
    const cost = Number(f.cost);
    if (!cost || cost <= 0) {
      showMsg("Укажите стоимость предложения", "error");
      return;
    }
    setProposalSaving(reqId);
    try {
      await api.adminSendProposal(token, reqId, { proposal_cost: cost, proposal_comment: f.comment || "" });
      showMsg("Предложение отправлено клиенту", "success");
      await load();
    } catch (e) {
      showMsg(e.message, "error");
    } finally {
      setProposalSaving(null);
    }
  };

  const decideReschedule = async (reqId, approve) => {
    setRescheduleSaving(reqId);
    try {
      await api.adminRescheduleDecision(token, reqId, approve);
      showMsg(approve ? "Перенос одобрен" : "Перенос отклонён", "success");
      await load();
    } catch (e) {
      showMsg(e.message, "error");
    } finally {
      setRescheduleSaving(null);
    }
  };

  const refreshControl = Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined;

  const renderCreateTab = () => {
    const actionButtons = [];

    if (!!form.request_id && !editingOrderId) {
      actionButtons.push(
        <ActionButton
          key="save-request"
          title="Сохранить правки в заявке"
          variant="secondary"
          loading={savingRequest}
          onPress={saveRequestEdits}
        />
      );
    }

    if (editingOrderId) {
      actionButtons.push(
        <ActionButton key="cancel-edit" title="Отмена" variant="secondary" onPress={() => { resetCreateForm(); setTab("orders"); }} />,
        <ActionButton key="save-edit" title="Сохранить" loading={saving} onPress={() => saveOrder(false)} />
      );
      if (form.status === "draft") {
        actionButtons.push(
          <ActionButton key="publish-edit" title="Опубликовать специалисту" color={colors.success} loading={saving} onPress={() => saveOrder(true)} />
        );
      }
    } else {
      actionButtons.push(
        <ActionButton key="save-draft" title="Сохранить черновик" variant="secondary" loading={saving} onPress={() => saveOrder(false)} />,
        <ActionButton key="publish" title="Подтвердить и опубликовать" color={colors.success} loading={saving} onPress={() => saveOrder(true)} />
      );
    }

    return (
    <View style={styles.tabPane}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
      >
        <RefreshButton onPress={onRefresh} loading={refreshing} />
        <Text style={styles.sectionHint}>
          {editingOrderId
            ? `Редактирование заказа #${editingOrderId}`
            : "Создание заказа после согласования с клиентом"}
        </Text>

        {!!editingOrderId && (
          <>
            <Text style={styles.fieldLabel}>Статус заказа</Text>
            <View style={styles.statusRow}>
              {ORDER_STATUSES.map((s) => {
                const active = form.status === s.key;
                return (
                  <Pressable
                    key={s.key}
                    style={[styles.statusChip, active && styles.statusChipActive]}
                    onPress={() => patchForm({ status: s.key })}
                  >
                    <StatusBadge status={s.key} type="order" />
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {!!form.request_id && !editingOrderId && (
          <View style={styles.requestSourcePanel}>
            <Text style={styles.requestSourceTitle}>Заявка #{form.request_id}</Text>
            <Text style={styles.muted}>
              Можно исправить ошибки клиента — изменения сохранятся в заявке до формирования заказа
            </Text>
            {!!form.preferred_specialist_name && (
              <Text style={styles.muted}>Желаемый специалист: {form.preferred_specialist_name}</Text>
            )}
          </View>
        )}

        <CatalogPickerPanel
          catalogItems={catalogItems}
          selected={form.selected_catalog || []}
          onToggle={toggleCatalogItem}
          onUpdateQty={updateCatalogQty}
          title="Позиции из каталога"
          hint={
            form.request_id
              ? "Отметьте или снимите услуги — список работ и стоимость обновятся автоматически"
              : "Выберите услуги для заказа — сумма подставится в стоимость"
          }
        />

        <Text style={styles.fieldLabel}>Адрес * {form.address ? "✓" : ""}</Text>
        <TextInput
          style={styles.input}
          placeholder="ул. Пример, 1"
          value={form.address}
          onChangeText={(v) => patchForm({ address: v })}
        />

        <Text style={styles.fieldLabel}>Работы (каждая с новой строки)</Text>
        <TextInput style={[styles.input, styles.tall]} multiline value={form.works} onChangeText={(v) => patchForm({ works: v })} />
        <Text style={styles.fieldLabel}>Стоимость (₽)</Text>
        <TextInput style={styles.input} placeholder="Стоимость" keyboardType="numeric" value={form.estimated_cost} onChangeText={(v) => patchForm({ estimated_cost: v })} />
        <Text style={styles.fieldLabel}>Контакт ФИО</Text>
        <TextInput style={styles.input} placeholder="Контакт ФИО" value={form.contact_name} onChangeText={(v) => patchForm({ contact_name: v })} />
        <Text style={styles.fieldLabel}>Телефон</Text>
        <TextInput style={styles.input} placeholder="Телефон" value={form.contact_phone} onChangeText={(v) => patchForm({ contact_phone: v })} />
        <Text style={styles.fieldLabel}>Комментарий / описание клиента</Text>
        <TextInput style={styles.input} placeholder="Комментарии клиента" value={form.client_comments} onChangeText={(v) => patchForm({ client_comments: v })} />
        <Text style={styles.fieldLabel}>Дата выезда</Text>
        <TextInput style={styles.input} placeholder="Дата" value={form.visit_date} onChangeText={(v) => patchForm({ visit_date: v })} />
        <Text style={styles.fieldLabel}>Время выезда</Text>
        <TextInput style={styles.input} placeholder="Время" value={form.visit_time} onChangeText={(v) => patchForm({ visit_time: v })} />

        <SearchablePicker
          label={`Клиент (аккаунт) ${form.client_user_id ? "✓" : ""}`}
          hint="Привязка заказа к личному кабинету клиента"
          placeholder="Выберите клиента"
          searchPlaceholder="Поиск: имя, логин, телефон, email…"
          accent="purple"
          value={form.client_user_id}
          onChange={selectClient}
          items={clients}
          emptyOption={{
            title: "Без привязки к аккаунту",
            subtitle: "Только контактные данные в форме"
          }}
          getItemSubtitle={(c) => `${c.login} · ${c.phone || "телефон не указан"} · заказов: ${c.orders_count}`}
          filterItem={(c, q) => matchQuery([c.full_name, c.login, c.email, c.phone], q)}
        />

        <SearchablePicker
          label={`Специалист * ${form.assigned_user_id ? "✓" : ""}`}
          hint="Выездной специалист, которому будет назначен заказ"
          placeholder="Выберите специалиста"
          searchPlaceholder="Поиск: имя, должность…"
          accent="blue"
          value={form.assigned_user_id}
          onChange={(id) => patchForm({ assigned_user_id: id })}
          items={employees}
          getItemSubtitle={specialistSubtitle}
          filterItem={(e, q) => matchQuery([e.full_name, e.position], q)}
          renderItemExtra={(e) => <SpecialistPickerExtra specialist={e} />}
        />

        {!!editingOrderId && <OrderChatBlock orderId={editingOrderId} />}
      </ScrollView>

      <FormActionBar>{actionButtons}</FormActionBar>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Администрирование</Text>
      <FeedbackBanner message={feedback} type={feedbackType} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {[
          ["dashboard", "Сводка"],
          ["reports", "Отчёты"],
          ["requests", "Заявки"],
          ["orders", "Заказы"],
          ["catalog", "Каталог"],
          ["audit", "Журнал"],
          ["complaints", "Претензии"],
          ["search", "Поиск"],
          ["clients", "Клиенты"],
          ["create", editingOrderId ? "Редактировать" : "Создать"],
          ["chats", "Чаты"]
        ].map(([key, label]) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => {
              if (key === "create" && tab !== "create" && !editingOrderId) resetCreateForm();
              setTab(key);
              if (key === "chats") setChatUnread(0);
            }}
          >
            <View style={styles.tabLabelRow}>
              <Text style={tab === key ? styles.tabTextActive : styles.tabText}>{label}</Text>
              {key === "chats" && chatUnread > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{chatUnread > 9 ? "9+" : chatUnread}</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.body}>
        {tab === "dashboard" && <AdminDashboardPanel />}
        {tab === "reports" && <AdminReportsPanel />}
        {tab === "catalog" && <AdminCatalogPanel />}
        {tab === "audit" && <AdminAuditPanel />}
        {tab === "complaints" && <AdminComplaintsPanel />}

        {tab === "requests" && (
          <FlatList
            style={styles.flex}
            data={sortedRequests}
            keyExtractor={(i) => String(i.id)}
            refreshControl={refreshControl}
            contentContainerStyle={styles.listPad}
            ListHeaderComponent={
              <>
                <RefreshButton onPress={onRefresh} loading={refreshing} />
                <ListSortChips sortBy={requestSortBy} onChange={setRequestSortBy} />
                <Text style={styles.sectionHint}>
                  Активные заявки (после формирования заказа исчезают из списка)
                </Text>
              </>
            }
            ListEmptyComponent={<Text style={styles.empty}>Нет новых заявок</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>
                    {item.client_name} · {SOURCE_LABELS[item.source] || item.source}
                  </Text>
                  <StatusBadge status={item.status} type="request" />
                </View>
                <Text>{item.address}</Text>
                <Text style={styles.muted}>{item.description}</Text>
                {!!item.catalog_items?.length && (
                  <View style={styles.catalogPreview}>
                    <Text style={styles.catalogPreviewTitle}>Каталог ({item.catalog_items.length})</Text>
                    {item.catalog_items.map((c, i) => (
                      <Text key={`${c.catalog_item_id}-${i}`} style={styles.muted}>
                        · {c.title}{Number(c.quantity) > 1 ? ` × ${c.quantity}` : ""} — {c.subtotal ?? Number(c.price) * Number(c.quantity || 1)} ₽
                      </Text>
                    ))}
                    {item.estimated_cost != null && (
                      <Text style={styles.catalogPreviewTotal}>Итого: {item.estimated_cost} ₽</Text>
                    )}
                  </View>
                )}
                {!!item.preferred_specialist_name && (
                  <Text style={styles.muted}>
                    Желаемый специалист: {item.preferred_specialist_name}
                    {item.preferred_specialist_completed_orders != null
                      ? ` · выполнено ${item.preferred_specialist_completed_orders} заказов`
                      : ""}
                  </Text>
                )}
                {!!item.admin_notes && <Text style={styles.muted}>Заметка: {item.admin_notes}</Text>}
                {item.proposal_status === "pending" && (
                  <Text style={styles.proposalPending}>Предложение ожидает ответа клиента ({item.proposal_cost} ₽)</Text>
                )}
                {item.reschedule_request?.status === "pending" && (
                  <View style={styles.rescheduleBlock}>
                    <Text style={styles.rescheduleTitle}>Запрос на перенос</Text>
                    <Text style={styles.muted}>
                      {item.reschedule_request.visit_date} {item.reschedule_request.visit_time}
                    </Text>
                    {!!item.reschedule_request.comment && (
                      <Text style={styles.muted}>{item.reschedule_request.comment}</Text>
                    )}
                    <ButtonRow>
                      <ActionButton
                        title="Одобрить"
                        color={colors.success}
                        size="sm"
                        loading={rescheduleSaving === item.id}
                        onPress={() => decideReschedule(item.id, true)}
                      />
                      <ActionButton
                        title="Отклонить"
                        color={colors.danger}
                        size="sm"
                        loading={rescheduleSaving === item.id}
                        onPress={() => decideReschedule(item.id, false)}
                      />
                    </ButtonRow>
                  </View>
                )}
                {!item.proposal_status && item.status !== "confirmed" && (
                  <View style={styles.proposalForm}>
                    <Text style={styles.fieldLabel}>Отправить предложение клиенту</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Стоимость (₽)"
                      keyboardType="numeric"
                      value={proposalForms[item.id]?.cost || ""}
                      onChangeText={(v) => patchProposalForm(item.id, { cost: v })}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Комментарий"
                      value={proposalForms[item.id]?.comment || ""}
                      onChangeText={(v) => patchProposalForm(item.id, { comment: v })}
                    />
                    <ActionButton
                      title="Отправить"
                      size="sm"
                      loading={proposalSaving === item.id}
                      onPress={() => sendProposal(item.id)}
                    />
                  </View>
                )}
                <ButtonRow>
                  <ActionButton title="Исправить" variant="secondary" size="sm" onPress={() => openRequestForm(item, "edit")} />
                  <ActionButton title="В заказ" size="sm" onPress={() => publishFromRequest(item)} />
                </ButtonRow>
              </View>
            )}
          />
        )}

        {tab === "orders" && (
          <FlatList
            style={styles.flex}
            data={sortedOrders}
            keyExtractor={(i) => String(i.id)}
            refreshControl={refreshControl}
            contentContainerStyle={styles.listPad}
            ListHeaderComponent={
              <>
                <RefreshButton onPress={onRefresh} loading={refreshing} />
                <ListSortChips sortBy={orderSortBy} onChange={setOrderSortBy} />
                <Text style={styles.sectionHint}>Нажмите заказ для редактирования. Быстрый поиск — вкладка «Поиск»</Text>
              </>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Pressable onPress={() => openEditOrder(item)}>
                  <View style={styles.row}>
                    <Text style={styles.cardTitle}>#{item.id} · {item.specialist_name}</Text>
                    <StatusBadge status={item.status} type="order" />
                  </View>
                  <Text>{item.address}</Text>
                  <Text style={styles.muted}>
                    Заказчик: {item.client_name || item.contact_name} · {item.client_phone || ""}
                  </Text>
                  <Text style={styles.muted}>
                    {item.visit_date} {item.visit_time} · ~{item.estimated_cost} ₽
                  </Text>
                </Pressable>
                {item.status === "draft" && (
                  <ButtonRow>
                    <ActionButton
                      title="Опубликовать"
                      color={colors.success}
                      size="sm"
                      loading={saving}
                      onPress={() => publishOrderQuick(item.id)}
                    />
                  </ButtonRow>
                )}
              </View>
            )}
          />
        )}

        {tab === "search" && <AdminSearchPanel onOpenOrder={openEditOrder} />}

        {tab === "clients" && <AdminClientsPanel onOpenOrder={openEditOrder} />}

        {tab === "create" && renderCreateTab()}

        {tab === "chats" && <AdminChatsPanel navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg, backgroundColor: colors.bg, minHeight: 0 },
  flex: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
  tabPane: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0, ...(Platform.OS === "web" ? { overflow: "scroll" } : {}) },
  scrollContent: { paddingBottom: space.lg, gap: space.md },
  title: { fontSize: 22, fontWeight: "700", marginBottom: space.sm, color: colors.text },
  tabs: { maxHeight: 48, marginBottom: space.md, flexGrow: 0 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600", fontSize: 13 },
  tabLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabBadge: { backgroundColor: colors.danger, borderRadius: 8, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sectionHint: { color: colors.textMuted, marginBottom: space.md, fontSize: 13, lineHeight: 18 },
  listPad: { paddingBottom: space.lg, gap: space.sm },
  empty: { textAlign: "center", color: colors.textSubtle, marginTop: space.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.sm,
    ...shadow.card
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: space.sm },
  cardTitle: { fontWeight: "700", flex: 1, color: colors.text, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 13, marginVertical: 2, lineHeight: 18 },
  fieldLabel: { fontWeight: "600", marginBottom: 4, fontSize: 13, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
    backgroundColor: colors.surface,
    fontSize: 16
  },
  tall: { minHeight: 80, textAlignVertical: "top" },
  label: { fontWeight: "600", marginBottom: space.sm, marginTop: 4 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.md },
  statusChip: { borderRadius: radius.sm, borderWidth: 2, borderColor: "transparent", padding: 2 },
  statusChipActive: { borderColor: colors.primary },
  proposalPending: { color: colors.warning, fontWeight: "600", fontSize: 13 },
  proposalForm: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: space.xs
  },
  rescheduleBlock: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: "#bae6fd"
  },
  rescheduleTitle: { fontWeight: "700", color: colors.primaryDark },
  requestSourcePanel: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    ...shadow.card
  },
  requestSourceTitle: { fontWeight: "700", color: "#166534", marginBottom: 2 },
  catalogPreview: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: space.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  catalogPreviewTitle: { fontWeight: "600", fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  catalogPreviewTotal: { fontWeight: "700", fontSize: 13, color: "#0f766e", marginTop: 4 }
});
