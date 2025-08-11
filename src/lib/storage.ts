import type { Chat, Message } from "@/types";

const KEY = "careiq.chats.v1";

export const Storage = {
  getChats(): Chat[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Chat[]) : [];
    } catch {
      return [];
    }
  },
  saveChats(chats: Chat[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(chats));
  },
};

export function createEmptyChat(): Chat {
  return {
    id: crypto.randomUUID(),
    title: "",
    createdAt: Date.now(),
    messages: [],
  };
}

export function addMessage(chats: Chat[], chatId: string, msg: Message): Chat[] {
  return chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c));
}
