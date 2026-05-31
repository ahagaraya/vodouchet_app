import { Platform } from "react-native";

const STYLE_ID = "vodouchet-chat-scroll";

/** Тонкий скроллбар справа, не перекрывает пузыри (web). */
export function ensureChatScrollStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-chat-scroll="true"] {
      scrollbar-gutter: stable;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }
    [data-chat-scroll="true"]::-webkit-scrollbar {
      width: 6px;
    }
    [data-chat-scroll="true"]::-webkit-scrollbar-track {
      background: transparent;
      margin: 6px 2px;
    }
    [data-chat-scroll="true"]::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 8px;
      min-height: 32px;
    }
    [data-chat-scroll="true"]::-webkit-scrollbar-thumb:hover {
      background: #b8c5d4;
    }
  `;
  document.head.appendChild(style);
}

export function chatScrollViewProps() {
  if (Platform.OS !== "web") return {};
  return { dataSet: { chatScroll: "true" } };
}

export const chatScrollContentPadding = Platform.OS === "web" ? { paddingRight: 4 } : null;

if (Platform.OS === "web") {
  ensureChatScrollStyles();
}
