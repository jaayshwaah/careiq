"use client";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import { Chat, Message } from "@/types";
import { createEmptyChat, Storage } from "@/lib/storage";

export default function HomePage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    // Ensure a chat exists so we can append the first message from the home view
    let target = activeChat;
    if (!target) {
      const newChat = createEmptyChat();
      const updated = [newChat, ...chats];
      setChats(updated);
      setActiveId(newChat.id);
      Storage.saveChats(updated);
      target = newChat;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    // Optimistic add of user message
    let updated = (Storage.getChats().length ? Storage.getChats() : chats).map((c) =>
      c.id === target!.id ? { ...c, messages: [...c.messages, userMsg] } : c
    );
    setChats(updated);
    Storage.saveChats(updated);

    // Try streaming first; fallback to non-streaming
    try {
      const res = await fetch("/api/messages/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: target!.id, message: userMsg }),
      });
      if (!res.ok || !res.body) throw new Error("no-stream");

      // Insert placeholder assistant message and stream into it
      const aiId = crypto.randomUUID();
      updated = updated.map((c) =>
        c.id === target!.id
          ? { ...c, messages: [...c.messages, { id: aiId, role: "assistant", content: "", createdAt: Date.now() }] }
          : c
      );
      setChats(updated);
      Storage.saveChats(updated);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith("data:")) continue;
          const data = raw.slice(5).trim();
          if (data === "[DONE]") {
            // Title heuristic
            const title = userMsg.content.split("\n")[0].slice(0, 40);
            const final = Storage.getChats().map((c) =>
              c.id === target!.id ? { ...c, title: c.title || title } : c
            );
            setChats(final);
            Storage.saveChats(final);
            break;
          }
          try {
            const json = JSON.parse(data);
            const token: string | undefined =
              json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content;
            if (token) {
              const now = Storage.getChats();
              const next = now.map((c) =>
                c.id !== target!.id
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) => (m.id === aiId ? { ...m, content: m.content + token } : m)),
                    }
              );
              setChats(next);
              Storage.saveChats(next);
            }
            if (json?.error?.hint) {
              const now = Storage.getChats();
              const next = now.map((c) =>
                c.id !== target!.id
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === aiId ? { ...m, content: "I couldn’t reach the model. Please try again." } : m
                      ),
                    }
              );
              setChats(next);
              Storage.saveChats(next);
            }
          } catch {
            // ignore
          }
        }
      }
      return;
    } catch {
      // fallback to non-streaming
    }

    const res = await fetch(`/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: target!.id, message: userMsg }),
    });
    const data = await res.json();
    const aiMsg: Message = data.message;

    const finalized = Storage.getChats().map((c) =>
      c.id === target!.id
        ? {
            ...c,
            messages: [...c.messages, aiMsg],
            title: c.title || data.title || c.title,
          }
        : c
    );
    setChats(finalized);
    Storage.saveChats(finalized);
  }

  const cols = sidebarOpen ? "grid-cols-[300px_1fr]" : "grid-cols-[72px_1fr]";

  return (
    <main className={`grid h-dvh ${cols} bg-black`}>
      <aside className="border-r border-white/10 bg-[#0b0b0b]">
        <Sidebar
          chats={chats}
          activeId={activeId}
          collapsed={!sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
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
