import React, { useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable, RefreshControl, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ActionButton } from "../components/ActionButton";
import { RefreshButton } from "../components/RefreshButton";
import { confirmAction } from "../utils/confirm";
import { showFeedback } from "../utils/feedback";

export function AdminCatalogPanel() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const [its, cats] = await Promise.all([api.adminCatalogItems(token), api.adminCatalogCategories(token)]);
    setItems(its);
    setCategories(cats);
    if (cats.length) {
      setNewCategoryId((prev) => prev || String(cats[0].id));
    }
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

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditPrice(String(item.price));
  };

  const saveEdit = async () => {
    if (!editingId || saving) return;
    setSaving(true);
    try {
      await api.adminCatalogItemUpdate(token, editingId, { title: editTitle.trim(), price: Number(editPrice) || 0 });
      setEditingId(null);
      showFeedback("Сохранено", "Позиция обновлена");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!(await confirmAction("Удалить позицию из каталога?"))) return;
    try {
      await api.adminCatalogItemDelete(token, id);
      showFeedback("Удалено", "Позиция удалена");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const addItem = async () => {
    if (!newTitle.trim() || !newCategoryId) {
      setError("Укажите название и категорию");
      return;
    }
    setSaving(true);
    try {
      await api.adminCatalogItemCreate(token, {
        title: newTitle.trim(),
        price: Number(newPrice) || 0,
        category_id: Number(newCategoryId)
      });
      setNewTitle("");
      setNewPrice("");
      showFeedback("Добавлено", "Позиция создана");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.adminCatalogCategoryCreate(token, { name: newCatName.trim() });
      setNewCatName("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <FlatList
      style={styles.flex}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <RefreshButton onPress={onRefresh} loading={refreshing} />
          <Text style={styles.hint}>Управление каталогом: цены, названия, категории</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Новая категория</Text>
            <TextInput style={styles.input} value={newCatName} onChangeText={setNewCatName} placeholder="Название категории" />
            <ActionButton title="Добавить категорию" variant="secondary" onPress={addCategory} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Новая позиция</Text>
            <TextInput style={styles.input} value={newTitle} onChangeText={setNewTitle} placeholder="Название" />
            <TextInput style={styles.input} value={newPrice} onChangeText={setNewPrice} placeholder="Цена" keyboardType="numeric" />
            <View style={styles.catRow}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.catChip, newCategoryId === String(c.id) && styles.catChipActive]}
                  onPress={() => setNewCategoryId(String(c.id))}
                >
                  <Text style={newCategoryId === String(c.id) ? styles.catChipTextActive : styles.catChipText}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
            <ActionButton title="Добавить позицию" loading={saving} onPress={addItem} />
          </View>

          <Text style={styles.sectionTitle}>Позиции ({items.length})</Text>
        </>
      }
      ListEmptyComponent={<Text style={styles.empty}>Каталог пуст</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {editingId === item.id ? (
            <>
              <TextInput style={styles.input} value={editTitle} onChangeText={setEditTitle} />
              <TextInput style={styles.input} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />
              <View style={styles.row}>
                <ActionButton title="Сохранить" loading={saving} onPress={saveEdit} />
                <ActionButton title="Отмена" variant="secondary" onPress={() => setEditingId(null)} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.category_name} · {item.price} ₽</Text>
              <View style={styles.row}>
                <ActionButton title="Изменить" variant="secondary" onPress={() => startEdit(item)} />
                <ActionButton title="Удалить" color="#b91c1c" onPress={() => deleteItem(item.id)} />
              </View>
            </>
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
  section: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 12 },
  sectionTitle: { fontWeight: "700", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: "#fff", fontSize: 16 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#f1f5f9" },
  catChipActive: { backgroundColor: "#e0f2fe" },
  catChipText: { color: "#475569", fontSize: 13 },
  catChipTextActive: { color: "#0369a1", fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", color: "#94a3b8", marginTop: 12 },
  card: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: "700", fontSize: 15, marginBottom: 4 },
  muted: { color: "#64748b", fontSize: 13, marginBottom: 8 },
  row: { gap: 8 }
});
