import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Platform, Text } from "react-native";
import { ensureChatScrollStyles } from "./utils/chatScrollWeb";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { HeaderBackButton } from "./components/HeaderBackButton";
import { HomeScreen } from "./screens/HomeScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { CatalogScreen } from "./screens/CatalogScreen";
import { ContactsScreen } from "./screens/ContactsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ReviewsScreen } from "./screens/ReviewsScreen";
import { SupportChatProvider } from "./context/SupportChatContext";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { RegisterScreen } from "./screens/RegisterScreen";
import { VerifyScreen } from "./screens/VerifyScreen";
import { AdminScreen } from "./screens/AdminScreen";
import { OrderDetailScreen } from "./screens/OrderDetailScreen";
import { ClientRequestsScreen } from "./screens/ClientRequestsScreen";
import { ClientRequestFormScreen } from "./screens/ClientRequestFormScreen";
import { ClientOrderDetailScreen } from "./screens/ClientOrderDetailScreen";
import { ChatThreadScreen } from "./screens/ChatThreadScreen";
import { EmployeeReviewsScreen } from "./screens/EmployeeReviewsScreen";
import { SupportChatWidget } from "./components/SupportChatWidget";
import { ConfirmHost } from "./components/ConfirmHost";
import { RequestCartProvider } from "./context/RequestCartContext";
import { ForgotPasswordScreen } from "./screens/ForgotPasswordScreen";
import { ProfileEditScreen } from "./screens/ProfileEditScreen";
import { ClientHistoryScreen } from "./screens/ClientHistoryScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Главная: "🏠",
  "Мои заявки": "📋",
  Выезды: "🚗",
  Админ: "⚙️",
  Каталог: "📦",
  Контакты: "📍",
  Отзывы: "⭐",
  Профиль: "👤"
};

function MainTabs() {
  const { profile } = useAuth();
  const isClient = profile?.role === "client";
  const isEmployee = profile?.role === "employee";
  const isAdmin = profile?.role === "admin";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{TAB_ICONS[route.name] || "•"}</Text>
        ),
        tabBarLabelStyle: { fontSize: 11, marginBottom: Platform.OS === "web" ? 0 : 2 },
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 58 : undefined,
          paddingTop: 4
        },
        tabBarActiveTintColor: "#0284c7",
        tabBarInactiveTintColor: "#64748b"
      })}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      {isClient ? (
        <Tab.Screen name="Мои заявки" component={ClientRequestsScreen} />
      ) : isEmployee ? (
        <Tab.Screen name="Выезды" component={OrdersScreen} />
      ) : null}
      {isAdmin && <Tab.Screen name="Админ" component={AdminScreen} />}
      <Tab.Screen name="Каталог" component={CatalogScreen} />
      <Tab.Screen name="Контакты" component={ContactsScreen} />
      <Tab.Screen name="Отзывы" component={ReviewsScreen} />
      <Tab.Screen name="Профиль" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const HEADER_TINT = "#0369a1";

const stackScreenOptions = ({ navigation }) => ({
  headerStyle: {
    backgroundColor: "#ffffff",
    ...(Platform.OS === "web" ? { borderBottomWidth: 1, borderBottomColor: "#e2e8f0" } : {})
  },
  headerTintColor: HEADER_TINT,
  headerTitleStyle: { color: "#0f172a", fontWeight: "700", fontSize: 17 },
  headerShadowVisible: Platform.OS !== "web",
  headerBackVisible: false,
  headerLeft: () => <HeaderBackButton navigation={navigation} tintColor={HEADER_TINT} />
});

function Root() {
  const { booting } = useAuth();
  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={stackScreenOptions}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false, title: "Главная" }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Вход" }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: "Восстановление пароля" }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Регистрация" }} />
        <Stack.Screen name="Verify" component={VerifyScreen} options={{ title: "Подтверждение Email" }} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: "Политика конфиденциальности" }} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "Карточка выезда" }} />
        <Stack.Screen name="ClientRequestForm" component={ClientRequestFormScreen} options={{ title: "Заявка на выезд" }} />
        <Stack.Screen name="ClientOrderDetail" component={ClientOrderDetailScreen} options={{ title: "Мой заказ" }} />
        <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ title: "Переписка" }} />
        <Stack.Screen name="EmployeeReviews" component={EmployeeReviewsScreen} options={{ title: "Отзывы специалиста" }} />
        <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: "Редактирование профиля" }} />
        <Stack.Screen name="ClientHistory" component={ClientHistoryScreen} options={{ title: "История обращений" }} />
      </Stack.Navigator>
      <ConfirmHost />
      <SupportChatWidget />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    ensureChatScrollStyles();
  }, []);

  return (
    <AuthProvider>
      <RequestCartProvider>
        <SupportChatProvider>
          <Root />
        </SupportChatProvider>
      </RequestCartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }
});
