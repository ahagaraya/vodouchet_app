import React, { createContext, useContext, useState, useCallback } from "react";

const SupportChatContext = createContext(null);

export function SupportChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const toggleChat = useCallback(() => setOpen((v) => !v), []);

  return (
    <SupportChatContext.Provider value={{ open, setOpen, openChat, closeChat, toggleChat }}>
      {children}
    </SupportChatContext.Provider>
  );
}

export function useSupportChat() {
  const ctx = useContext(SupportChatContext);
  if (!ctx) throw new Error("useSupportChat must be used within SupportChatProvider");
  return ctx;
}
