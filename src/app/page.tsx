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

    // 1) Add the user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
    };
    let updated = (Storage.getChats().length ? Storage.getChats() : chats).map((c) =>
      c.id === target!.id ? { ...c, messages: [...c.messages, userMsg] } : c
    );
    setChats(updated);
    Storage.saveChats(updated);

    // 2) Add a placeholder assistant message we will stream into
    const aiId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: aiId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };
    updated = updated.map((c) =>
      c.id === target!.id ? { ...c, messages: [...c.messages, assistantMsg] } : c
    );
    setChats(updated);
    Storage.saveChats(updated);

    // 3) Stream tokens
    try {
      const resp = await fetch("/api/messages/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: target!.id, message: userMsg }),
      });

      if (!resp.ok || !resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) buffer += decoder.decode(value, { stream: true });

        // Parse Server-Sent Events: lines like "data: {...}\n\n"
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!rawEvent.startsWith("data:")) continue;
          const data = rawEvent.slice(5).trim();

          if (data === "[DONE]") {
            // Heuristic title: first line of the user's first message
            const title = userMsg.content.split("\n")[0].slice(0, 40);
            const finalized = Storage.getChats().map((c) =>
              c.id === target!.id ? { ...c, title: c.title || title } : c
            );
            setChats(finalized);
            Storage.saveChats(finalized);
            break;
          }

          try {
            const json = JSON.parse(data);
            // OpenAI/OR format: choices[0].delta.content
            const token: string | undefined =
              json?.choices?.[0]?.delta?.content ?? json?.choices?.[0]?.message?.content;

            if (token) {
              const now = Storage.getChats();
              const next = now.map((c) => {
                if (c.id !== target!.id) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiId ? { ...m, content: (m.content || "") + token } : m
                  ),
                };
              });
              setChats(next);
              Storage.saveChats(next);
            }

            // Optional: if server sent an error envelope, replace placeholder text
            if (json?.error?.hint) {
              const now = Storage.getChats();
              const next = now.map((c) => {
                if (c.id !== target!.id) return c;
                return {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiId ? { ...m, content: "I couldn’t reach the model just now. Please try again." } : m
                  ),
                };
              });
              setChats(next);
              Storage.saveChats(next);
            }
          } catch {
            // ignore JSON parse errors on keepalive/comments
          }
        }
      }
    } catch {
      // Fallback: call non-streaming endpoint so user still gets a reply
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: target!.id, message: userMsg }),
      });
      const data = await res.json();
      const now = Storage.getChats();
      const next = now.map((c) => {
        if (c.id !== target!.id) return c;
        return {
          ...c,
          messages: c.messages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: data?.message?.content || "Sorry, try again." } : m
          ),
          title: c.title || data?.title || c.title,
        };
      });
      setChats(next);
      Storage.saveChats(next);
    }
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
