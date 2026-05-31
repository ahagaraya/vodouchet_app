import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useRequestCart } from "../context/RequestCartContext";
import { ActionButton } from "../components/ActionButton";
import { BottomActions } from "../components/BottomActions";
import { ScreenHeader } from "../components/ScreenHeader";
import { navigateToStack } from "../utils/navigation";
import { commonStyles } from "../styles/common";
import { colors, layout, radius, space } from "../theme";

const GRID_GAP = space.md;

function gridColumns(innerWidth) {
  if (innerWidth >= 640) return 3;
  if (innerWidth >= 400) return 2;
  return 1;
}

export function CatalogScreen({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const { token, profile } = useAuth();
  const { addItem, count, items: cartItems, total } = useRequestCart();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [brokenImages, setBrokenImages] = useState({});
  const [error, setError] = useState("");
  const isClient = profile?.role === "client";

  const grid = useMemo(() => {
    const pageWidth = Math.min(windowWidth, layout.maxContentWidth);
    const innerWidth = pageWidth - space.lg * 2;
    const columns = gridColumns(innerWidth);
    const cellWidth = Math.floor((innerWidth - GRID_GAP * (columns - 1)) / columns);
    return { pageWidth, innerWidth, columns, cellWidth };
  }, [windowWidth]);

  const load = async (categoryId = "") => {
    try {
      setError("");
      const data = await api.catalog(categoryId || undefined);
      setCategories(data.categories);
      setItems(data.items);
    } catch (e) {
      setError(e.message || "Не удалось загрузить каталог");
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addToCart = (item) => {
    if (!token) {
      navigateToStack(navigation, "Login");
      return;
    }
    if (!isClient) return;
    addItem(item);
  };

  const goToRequest = () => {
    navigateToStack(navigation, "ClientRequestForm", {
      catalog_items: cartItems.map((i) => ({ ...i }))
    });
  };

  const inCart = (id) => cartItems.some((c) => c.catalog_item_id === id);

  const renderCard = (item) => (
    <View style={[commonStyles.listCard, styles.catalogCard]}>
      {brokenImages[item.id] ? (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={styles.imageFallbackText}>Фото временно недоступно</Text>
        </View>
      ) : (
        <Image
          source={{ uri: item.image_url }}
          style={styles.image}
          onError={() => setBrokenImages((prev) => ({ ...prev, [item.id]: true }))}
        />
      )}
      <Text style={styles.name}>{item.title}</Text>
      <Text style={styles.desc}>{item.description}</Text>
      <Text style={styles.price}>{item.price} ₽</Text>
      {isClient && (
        <ActionButton
          title={inCart(item.id) ? "В корзине ✓" : "В корзину"}
          variant={inCart(item.id) ? "primary" : "secondary"}
          size="sm"
          onPress={() => addToCart(item)}
        />
      )}
    </View>
  );

  return (
    <View style={commonStyles.screen}>
      <View style={[styles.page, { maxWidth: layout.maxContentWidth }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <ScreenHeader
              title="Каталог услуг"
              subtitle={isClient ? "Добавляйте позиции в корзину — смета соберётся автоматически" : undefined}
              style={styles.headerFlex}
            />
            {isClient && count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count}</Text>
              </View>
            )}
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.pickerWrap}>
            <Picker selectedValue={selectedCategory} onValueChange={(value) => { setSelectedCategory(value); load(value); }}>
              <Picker.Item label="Все категории" value="" />
              {categories.map((c) => (
                <Picker.Item key={c.id} label={c.name} value={String(c.id)} />
              ))}
            </Picker>
          </View>

          <View style={[styles.grid, { width: grid.innerWidth }]}>
            {items.map((item) => (
              <View key={item.id} style={[styles.gridCell, { width: grid.cellWidth }]}>
                {renderCard(item)}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {isClient && count > 0 && (
        <BottomActions align="center">
          <ActionButton title={`Заявка · ${count} поз. · ${total} ₽`} onPress={goToRequest} />
        </BottomActions>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
    minHeight: 0,
    ...(Platform.OS === "web" ? { overflow: "visible" } : {})
  },
  scroll: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === "web" ? { overflow: "scroll" } : {})
  },
  scrollContent: {
    padding: space.lg,
    paddingBottom: space.xxl,
    alignItems: "center"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    alignSelf: "center",
    ...(Platform.OS === "web" ? { overflow: "visible" } : {})
  },
  gridCell: {
    ...(Platform.OS === "web" ? { overflow: "visible" } : {})
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm
  },
  headerFlex: { flex: 1, marginBottom: space.md },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginTop: 4
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  pickerWrap: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
    overflow: "hidden"
  },
  image: { width: "100%", height: 130, borderRadius: radius.sm, marginBottom: space.sm },
  imageFallback: {
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.sm
  },
  imageFallbackText: { color: colors.textSecondary, textAlign: "center", fontSize: 13 },
  error: { color: colors.danger, marginBottom: space.sm, width: "100%" },
  name: { fontWeight: "700", marginBottom: 4, color: colors.text, fontSize: 15 },
  desc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  price: { marginTop: space.sm, fontSize: 16, fontWeight: "700", color: "#0f766e" },
  catalogCard: {
    marginBottom: 0,
    ...(Platform.OS === "web" ? { boxSizing: "border-box" } : {})
  }
});
