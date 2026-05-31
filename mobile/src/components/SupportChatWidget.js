import React, { useState, useRef, useMemo } from "react";
import { View, Text, Pressable, StyleSheet, Platform, PanResponder, Dimensions } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useSupportChat } from "../context/SupportChatContext";
import { api } from "../services/api";
import { ChatPanel, useChatPoll } from "./ChatPanel";
import { FeedbackBanner } from "./FeedbackBanner";

const DEFAULT_W = Platform.OS === "web" ? 380 : 340;
const DEFAULT_H = 440;
const MIN_W = 300;
const MIN_H = 320;
const MAX_W = Platform.OS === "web" ? 720 : 520;
const MAX_H = Platform.OS === "web" ? 860 : 700;

function clampSize(w, h) {
  return {
    width: Math.min(MAX_W, Math.max(MIN_W, w)),
    height: Math.min(MAX_H, Math.max(MIN_H, h))
  };
}

function clampDrag(x, y, panelW, panelH) {
  const { width: sw, height: sh } = Dimensions.get("window");
  const maxLeft = -(sw - panelW - 32);
  const maxUp = -(sh - panelH - 100);
  return {
    x: Math.min(60, Math.max(maxLeft, x)),
    y: Math.min(60, Math.max(maxUp, y))
  };
}

/** Виджет «Онлайн-чат» — панель без затемнения, перетаскивается за шапку, ресайз за угол */
export function SupportChatWidget() {
  const { token, profile } = useAuth();
  const { open, toggleChat, closeChat } = useSupportChat();
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [panelSize, setPanelSize] = useState({ width: DEFAULT_W, height: DEFAULT_H });
  const dragStart = useRef({ x: 0, y: 0 });
  const dragPos = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ width: DEFAULT_W, height: DEFAULT_H });
  const panelSizeRef = useRef(panelSize);
  panelSizeRef.current = panelSize;

  const { messages, setMessages, unreadCount, loading, sending, setSending, error, load } = useChatPoll(
    () => api.chatGeneral(token),
    [token]
  );

  dragPos.current = drag;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
        onPanResponderGrant: () => {
          dragStart.current = { ...dragPos.current };
        },
        onPanResponderMove: (_, g) => {
          setDrag(
            clampDrag(
              dragStart.current.x + g.dx,
              dragStart.current.y + g.dy,
              panelSize.width,
              panelSize.height
            )
          );
        }
      }),
    [panelSize.width, panelSize.height]
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          resizeStart.current = { ...panelSizeRef.current };
        },
        onPanResponderMove: (_, g) => {
          // Окно привязано к right/bottom — тянем левый верхний угол: влево/вверх = больше
          setPanelSize(
            clampSize(
              resizeStart.current.width - g.dx,
              resizeStart.current.height - g.dy
            )
          );
        }
      }),
    []
  );

  if (!token || !profile || profile.role === "admin") return null;

  const send = async (text) => {
    setSending(true);
    try {
      const res = await api.chatGeneralSend(token, text);
      setMessages((prev) => [...prev, res.chatMessage]);
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      {open && (
        <View style={styles.layer} pointerEvents="box-none">
          <Pressable style={styles.dismissHit} onPress={closeChat} />
          <View
            style={[
              styles.popup,
              {
                width: panelSize.width,
                height: panelSize.height,
                transform: [{ translateX: drag.x }, { translateY: drag.y }]
              }
            ]}
            pointerEvents="auto"
          >
            <View style={styles.dragHandle}>
              <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
                <Text style={styles.resizeIcon}>◤</Text>
              </View>
              <View style={styles.dragGrip} {...panResponder.panHandlers}>
                <Text style={styles.gripIcon}>⠿</Text>
                <View style={styles.dragTitles}>
                  <Text style={styles.modalTitle}>Онлайн-чат</Text>
                  <Text style={styles.modalSub}>Администратор</Text>
                </View>
              </View>
              <Pressable onPress={closeChat} style={styles.closeBtn} hitSlop={12}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.body}>
              <FeedbackBanner message={error} type="error" />
              <ChatPanel
                compact
                messages={messages}
                loading={loading}
                sending={sending}
                onSend={send}
                onRefresh={load}
                emptyHint="Онлайн-чат для помощи и поддержки. Напишите сообщение — администратор ответит."
              />
            </View>
          </View>
        </View>
      )}

      <Pressable style={styles.fab} onPress={toggleChat}>
        {unreadCount > 0 && !open && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
        <Text style={styles.fabText}>💬</Text>
        <Text style={styles.fabLabel}>{open ? "Закрыть" : "Чат"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...(Platform.OS === "web"
      ? { position: "fixed", right: 0, bottom: 0, left: 0, top: 0, zIndex: 9999, pointerEvents: "none" }
      : { position: "absolute", right: 0, bottom: 0, left: 0, top: 0, zIndex: 9999, pointerEvents: "box-none" })
  },
  layer: {
    flex: 1,
    pointerEvents: "box-none",
    ...(Platform.OS === "web"
      ? { position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }
      : { ...StyleSheet.absoluteFillObject })
  },
  dismissHit: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 0
  },
  popup: {
    position: "absolute",
    right: 16,
    bottom: 72,
    flexDirection: "column",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
    overflow: "hidden",
    zIndex: 1,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 8px 32px rgba(15,23,42,0.12)", cursor: "default" }
      : {})
  },
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0
  },
  dragHandle: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexShrink: 0,
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9"
  },
  resizeHandle: {
    width: 32,
    height: 32,
    marginTop: -2,
    marginLeft: -4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexShrink: 0,
    ...(Platform.OS === "web" ? { cursor: "nwse-resize", userSelect: "none" } : {})
  },
  resizeIcon: { fontSize: 16, color: "#64748b", lineHeight: 18 },
  dragGrip: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    minWidth: 0,
    paddingVertical: 4,
    ...(Platform.OS === "web" ? { cursor: "grab", userSelect: "none" } : {})
  },
  gripIcon: { fontSize: 18, color: "#94a3b8", lineHeight: 22 },
  dragTitles: { flex: 1, minWidth: 0 },
  fab: {
    position: "absolute",
    right: 16,
    bottom: Platform.OS === "web" ? 16 : 88,
    zIndex: 10001,
    backgroundColor: "#0ea5e9",
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    pointerEvents: "auto"
  },
  fabBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center"
  },
  fabBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  fabText: { fontSize: 20 },
  fabLabel: { color: "#fff", fontSize: 11, fontWeight: "700" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  modalSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 20, color: "#64748b" }
});
