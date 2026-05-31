import React, { useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, PanResponder, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { ChatPanel, useChatPoll } from "./ChatPanel";
import { FeedbackBanner } from "./FeedbackBanner";
import { openReviewFromChat } from "../utils/chatActions";
import { colors, radius, space } from "../theme";

const DEFAULT_H = 340;
const MIN_H = 260;
const MAX_H = Platform.OS === "web" ? 680 : 560;

function clampHeight(h) {
  return Math.min(MAX_H, Math.max(MIN_H, h));
}

/** Чат по заказу — прокрутка сообщений, изменение высоты за нижний край */
export function OrderChatBlock({ orderId, navigation: navigationProp, embedded }) {
  const { token, profile } = useAuth();
  const navigationHook = useNavigation();
  const navigation = navigationProp ?? navigationHook;
  const [panelHeight, setPanelHeight] = useState(embedded ? 340 : DEFAULT_H);
  const resizeStart = useRef(panelHeight);
  const panelHeightRef = useRef(panelHeight);
  panelHeightRef.current = panelHeight;

  const { messages, setMessages, loading, sending, setSending, error, load } = useChatPoll(
    () => api.chatOrder(token, orderId),
    [token, orderId]
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          resizeStart.current = panelHeightRef.current;
        },
        onPanResponderMove: (_, g) => {
          setPanelHeight(clampHeight(resizeStart.current + g.dy));
        }
      }),
    []
  );

  const send = async (text) => {
    setSending(true);
    try {
      const res = await api.chatOrderSend(token, orderId, text);
      setMessages((prev) => [...prev, res.chatMessage]);
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.shell, embedded ? styles.shellEmbedded : styles.shellBlock, { height: panelHeight }]}>
      {!embedded && (
        <>
          <Text style={styles.sectionTitle}>Чат по заказу</Text>
          <Text style={styles.hint}>Переписка с администратором и участниками по этому выезду</Text>
        </>
      )}
      <FeedbackBanner message={error} type="error" />
      <View style={styles.chatBody}>
        <ChatPanel
          compact
          messages={messages}
          loading={loading}
          sending={sending}
          onSend={send}
          onRefresh={load}
          actionEnabled={profile?.role === "client"}
          onMessageAction={(action) => {
            if (action?.type === "review" && action.order_id) {
              openReviewFromChat(navigation, action.order_id);
            }
          }}
          emptyHint="Сообщения по заказу появятся здесь"
        />
      </View>
      <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
        <View style={styles.resizeGrip} />
        <Text style={styles.resizeHint}>Тяните вниз, чтобы увеличить чат</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "column",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surfaceMuted
  },
  shellBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginTop: space.md,
    marginBottom: space.md,
    borderColor: colors.border
  },
  shellEmbedded: {
    marginTop: space.xs
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4, color: colors.text, flexShrink: 0 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: space.sm, flexShrink: 0 },
  chatBody: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden"
  },
  resizeHandle: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surfaceMuted,
    ...(Platform.OS === "web" ? { cursor: "ns-resize", userSelect: "none" } : {})
  },
  resizeGrip: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 4
  },
  resizeHint: {
    fontSize: 10,
    color: colors.textSubtle
  }
});
