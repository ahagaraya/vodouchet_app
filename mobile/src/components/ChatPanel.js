import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ActionButton } from "./ActionButton";
import { RefreshButton } from "./RefreshButton";
import { ChatScrollView } from "./ChatScrollView";
import { enterToSendChat } from "../utils/enterSubmit";
import { chatScrollViewProps, chatScrollContentPadding } from "../utils/chatScrollWeb";
import { colors, radius, space } from "../theme";

const ROLE_LABELS = { admin: "Админ", client: "Клиент", employee: "Специалист" };

function MessageBubble({ item, onMessageAction, actionEnabled }) {
  const actionLabel = item.action?.label;
  const action = item.action;
  const canPressAction = actionEnabled && typeof onMessageAction === "function" && !!action;

  const handleAction = () => {
    if (canPressAction) onMessageAction(action);
  };

  return (
    <View style={[styles.bubble, item.is_mine ? styles.bubbleMine : styles.bubbleOther]}>
      {!item.is_mine && (
        <Text style={styles.sender}>
          {item.sender_name} · {ROLE_LABELS[item.sender_role] || item.sender_role}
        </Text>
      )}
      <Text style={[styles.bubbleText, item.is_mine && styles.bubbleTextMine]}>{item.text}</Text>
      {!!actionLabel &&
        (canPressAction ? (
          <View style={styles.actionWrap}>
            <ActionButton title={actionLabel} color="#16a34a" onPress={handleAction} />
          </View>
        ) : (
          <View style={styles.actionStatic}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </View>
        ))}
      <Text style={[styles.time, item.is_mine && styles.timeMine]}>
        {new Date(item.created_at).toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        })}
      </Text>
    </View>
  );
}

export function ChatPanel({
  title,
  subtitle,
  messages = [],
  loading,
  sending,
  onSend,
  onRefresh,
  onMessageAction,
  actionEnabled = true,
  compact,
  emptyHint = "Напишите первое сообщение"
}) {
  const [text, setText] = useState("");
  const listRef = useRef(null);
  const scrollRef = useRef(null);

  const scrollToEnd = useCallback(() => {
    const scroll = compact ? scrollRef.current : listRef.current;
    if (!scroll || !messages.length) return;
    setTimeout(() => {
      if (compact) {
        scroll.scrollToEnd?.({ animated: true });
      } else {
        scroll.scrollToEnd?.({ animated: true });
      }
    }, 80);
  }, [compact, messages.length]);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, scrollToEnd]);

  const submit = async () => {
    const msg = String(text || "").trim();
    if (!msg || sending) return;
    setText("");
    await onSend(msg);
  };

  const renderMessages = () => {
    if (loading && !messages.length) {
      return <ActivityIndicator style={styles.loader} color="#0ea5e9" />;
    }
    if (!messages.length) {
      return <Text style={styles.empty}>{emptyHint}</Text>;
    }
    return messages.map((item) => (
      <MessageBubble
        key={String(item.id)}
        item={item}
        onMessageAction={onMessageAction}
        actionEnabled={actionEnabled}
      />
    ));
  };

  const inputBar = (
    <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Сообщение..."
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          {...enterToSendChat(submit)}
        />
      </View>
      <ActionButton
        title="Отпр."
        size="sm"
        onPress={submit}
        loading={sending}
        disabled={!String(text).trim()}
        style={styles.sendBtn}
      />
    </View>
  );

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {onRefresh && <RefreshButton onPress={onRefresh} loading={loading} />}
      <View style={[styles.body, compact && styles.bodyCompact]}>
        {compact ? (
          <ChatScrollView
            ref={scrollRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageScrollContent}
            onContentSizeChange={scrollToEnd}
          >
            {renderMessages()}
          </ChatScrollView>
        ) : (
          <FlatList
            ref={listRef}
            style={styles.list}
            {...chatScrollViewProps()}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={[chatScrollContentPadding, styles.listContent]}
            ListEmptyComponent={<Text style={styles.empty}>{emptyHint}</Text>}
            ListHeaderComponent={loading && !messages.length ? <ActivityIndicator style={styles.loader} color="#0ea5e9" /> : null}
            renderItem={({ item }) => (
              <MessageBubble item={item} onMessageAction={onMessageAction} actionEnabled={actionEnabled} />
            )}
          />
        )}
      </View>
      <View style={[styles.footer, compact && styles.footerCompact]}>{inputBar}</View>
    </View>
  );
}

/** Хук загрузки с автообновлением при фокусе */
export function useChatPoll(loadFn, deps = []) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError("");
      const data = await loadFn();
      setMessages(data.messages || []);
      setUnreadCount(Number(data.unread_count) || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 12000);
      return () => clearInterval(t);
    }, [load])
  );

  return { messages, setMessages, unreadCount, loading, sending, setSending, error, load };
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200, backgroundColor: colors.surfaceMuted },
  wrapCompact: { flex: 1, minHeight: 0, minWidth: 0, backgroundColor: "transparent" },
  body: { flex: 1, minHeight: 0, minWidth: 0 },
  bodyCompact: { overflow: "hidden" },
  footer: { flexShrink: 0 },
  footerCompact: {
    paddingTop: space.sm,
    paddingBottom: space.sm,
    paddingHorizontal: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface
  },
  messageScroll: { flex: 1, minHeight: 0 },
  messageScrollContent: {
    paddingVertical: space.sm,
    gap: space.sm,
    flexGrow: 1,
    ...(Platform.OS === "web" ? { paddingLeft: 2 } : {})
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 2, color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginBottom: space.sm },
  loader: { marginVertical: space.xxl },
  list: { flex: 1, minHeight: 140 },
  listContent: { paddingVertical: space.sm, gap: space.sm, ...(Platform.OS === "web" ? { paddingLeft: 2 } : {}) },
  empty: { textAlign: "center", color: colors.textSubtle, padding: space.lg, fontSize: 13 },
  bubble: {
    maxWidth: Platform.OS === "web" ? "82%" : "85%",
    padding: 10,
    borderRadius: radius.md,
    marginBottom: 4
  },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: colors.primary },
  bubbleOther: { alignSelf: "flex-start", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  sender: { fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: "600" },
  bubbleText: { fontSize: 15, color: colors.text },
  bubbleTextMine: { color: "#fff" },
  actionWrap: { marginTop: space.sm, alignSelf: "stretch" },
  actionStatic: {
    marginTop: space.sm,
    alignSelf: "stretch",
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10
  },
  actionText: { color: "#047857", fontWeight: "700", fontSize: 14 },
  time: { fontSize: 10, color: colors.textSubtle, marginTop: 4 },
  timeMine: { color: "#e0f2fe" },
  inputRow: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "flex-end",
    flexShrink: 0,
    paddingTop: space.sm,
    marginTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface
  },
  inputRowCompact: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: 0,
    alignItems: "center"
  },
  inputWrap: {
    flex: 1,
    minWidth: 0,
    padding: 3,
    ...(Platform.OS === "web" ? { boxSizing: "border-box" } : {})
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 96,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
    ...(Platform.OS === "web"
      ? {
          outlineStyle: "none",
          boxSizing: "border-box"
        }
      : {})
  },
  sendBtn: { flexShrink: 0, alignSelf: "center" }
});
