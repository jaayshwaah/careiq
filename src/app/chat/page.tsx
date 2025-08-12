"use client";

import ChatWindow from "@/components/ChatWindow";

/**
 * New Chat page
 * - Uses ChatWindow's built-in empty state + composer
 * - onSend dispatches the same 'composer:send' custom event if you haven't wired an API yet
 * - Drop-in: no extra deps
 */
export default function NewChatPage() {
  async function handleSend(text: string) {
    // If you already have an API, call it here.
    // For now, mirror your existing behavior:
    window.dispatchEvent(new CustomEvent("composer:send", { detail: { text } }));
  }

  return (
    <div className="h-full">
      <ChatWindow chat={null} onSend={handleSend} />
    </div>
  );
}
