import React, { useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, PanResponder, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ChatPanel, useChatPoll } from "../components/ChatPanel";
import { FeedbackBanner } from "../components/FeedbackBanner";
import { handleChatMessageAction } from "../utils/chatActions";
import { colors, space } from "../theme";

const MIN_CHAT_H = 280;
const MAX_CHAT_H = Platform.OS === "web" ? 720 : 600;

/** Экран диалога для админа (общий или по заказу) */
export function ChatThreadScreen({ route }) {
  const { mode, userId, orderId, title } = route.params;
  const { token, profile } = useAuth();
  const navigation = useNavigation();

  const loadFn = () =>
    mode === "general" ? api.adminChatGeneral(token, userId) : api.chatOrder(token, orderId);

  const { messages, setMessages, loading, sending, setSending, error, load } = useChatPoll(loadFn, [
    token,
    mode,
    userId,
    orderId
  ]);

  const [chatHeight, setChatHeight] = useState(mode === "order" ? 420 : undefined);
  const resizeStart = useRef(420);
  const chatHeightRef = useRef(chatHeight);
  chatHeightRef.current = chatHeight;

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode === "order",
        onMoveShouldSetPanResponder: () => mode === "order",
        onPanResponderGrant: () => {
          resizeStart.current = chatHeightRef.current || 420;
        },
        onPanResponderMove: (_, g) => {
          setChatHeight(Math.min(MAX_CHAT_H, Math.max(MIN_CHAT_H, resizeStart.current + g.dy)));
        }
      }),
    [mode]
  );

  const send = async (text) => {
    setSending(true);
    try {
      const res =
        mode === "general"
          ? await api.adminChatGeneralSend(token, userId, text)
          : await api.chatOrderSend(token, orderId, text);
      setMessages((prev) => [...prev, res.chatMessage]);
      await load();
    } finally {
      setSending(false);
    }
  };

  const isOrderChat = mode === "order";

  return (
    <View style={styles.wrap}>
      <FeedbackBanner message={error} type="error" />
      <View style={[styles.chatShell, isOrderChat && chatHeight ? { height: chatHeight } : styles.chatShellFlex]}>
        <ChatPanel
          compact={isOrderChat}
          title={title}
          subtitle={mode === "general" ? "Общий вопрос" : "Переписка по заказу"}
          messages={messages}
          loading={loading}
          sending={sending}
          onSend={send}
          onRefresh={load}
          onMessageAction={(action) => handleChatMessageAction(navigation, action, { role: profile?.role })}
        />
      </View>
      {isOrderChat && (
        <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
          <View style={styles.resizeGrip} />
          <Text style={styles.resizeHint}>Тяните вниз, чтобы увеличить чат</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.md, backgroundColor: colors.bg, minHeight: 0 },
  chatShell: {
    flexDirection: "column",
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: MIN_CHAT_H
  },
  chatShellFlex: { flex: 1, minHeight: 0 },
  resizeHandle: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: space.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    ...(Platform.OS === "web" ? { cursor: "ns-resize", userSelect: "none" } : {})
  },
  resizeGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4
  },
  resizeHint: { fontSize: 10, color: colors.textSubtle }
});
