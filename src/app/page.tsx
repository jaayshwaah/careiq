"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { Chat, Message } from "@/types";
import { createEmptyChat, Storage } from "@/lib/storage";

export default function HomePage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeChat = chats.find((c) => c.id === activeId) || null;

  useEffect(() => {
    const all = Storage.getChats();
    setChats(all);
    if (all.length && !activeId) setActiveId(all[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onNewChat() {
    const chat = createEmptyChat();
    const updated = [chat, ...chats];
    setChats(updated);
    setActiveId(chat.id);
    Storage.saveChats(updated);
  }

  function onSelectChat(id: string) {
    setActiveId(id);
  }

  function onRenameChat(id: string, title: string) {
    const updated = chats.map((c) => (c.id === id ? { ...c, title } : c));
    setChats(updated);
    Storage.saveChats(updated);
  }

  function onDeleteChat(id: string) {
    const updated = chats.filter((c) => c.id !== id);
    setChats(updated);
    Storage.saveChats(updated);
    if (activeId === id) setActiveId(updated[0]?.id ?? null);
  }

  async function onSendMessage(content: string) {
    if (!activeChat) return;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    // Optimistic update
    const updated = chats.map((c) =>
      c.id === activeChat.id ? { ...c, messages: [...c.messages, userMsg] } : c
    );
    setChats(updated);
    Storage.saveChats(updated);

    // Call our mock/LLM API
    const res = await fetch(`/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: activeChat.id, message: userMsg }),
    });

    const data = await res.json();
    const aiMsg: Message = data.message;

    const updated2 = Storage.getChats().map((c) =>
      c.id === activeChat.id
        ? {
            ...c,
            messages: [...c.messages, aiMsg],
            title: c.title || data.title || c.title,
          }
        : c
    );
    setChats(updated2);
    Storage.saveChats(updated2);
  }

  return (
    <main className="grid h-dvh grid-cols-[300px_1fr] bg-black">
      <aside className="border-r border-white/10 bg-[#0b0b0b]">
        <Sidebar
          chats={chats}
          activeId={activeId}
          onNewChat={onNewChat}
          onSelectChat={onSelectChat}
          onRenameChat={onRenameChat}
          onDeleteChat={onDeleteChat}
        />
      </aside>
      <section className="relative">
        <ChatWindow chat={activeChat} onSend={onSendMessage} />
      </section>
    </main>
  );
}
