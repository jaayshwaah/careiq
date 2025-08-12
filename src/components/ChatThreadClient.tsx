"use client";

import ChatWindow from "@/components/ChatWindow";
import type { Chat } from "@/types";

/**
 * Tiny client bridge so the page can fetch on the server and still render ChatWindow.
 * Keeps the same onSend fallback behavior you're already using.
 */
export default function ChatThreadClient({ chat }: { chat: Chat }) {
  async function handleSend(text: string) {
    // Wire your message POST here if ready; fallback mirrors current behavior.
    window.dispatchEvent(new CustomEvent("composer:send", { detail: { text } }));
  }

  return <ChatWindow chat={chat} onSend={handleSend} />;
}
