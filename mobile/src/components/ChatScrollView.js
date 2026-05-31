import React, { forwardRef } from "react";
import { ScrollView, StyleSheet, Platform } from "react-native";
import { chatScrollViewProps, chatScrollContentPadding } from "../utils/chatScrollWeb";

/** Прокрутка сообщений в чатах — отдельная полоса справа на web */
export const ChatScrollView = forwardRef(function ChatScrollView(
  { style, contentContainerStyle, children, ...rest },
  ref
) {
  return (
    <ScrollView
      ref={ref}
      style={[styles.scroll, style]}
      contentContainerStyle={[chatScrollContentPadding, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      {...chatScrollViewProps()}
      {...rest}
    >
      {children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === "web" ? { overflow: "scroll", WebkitOverflowScrolling: "touch" } : {})
  }
});
