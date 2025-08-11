"use client";
import { Chat } from "@/types";
import { useMemo, useState } from "react";

export default function Sidebar({
  chats,
  activeId,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}: {
  chats: Chat[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      chats.filter((c) =>
        (c.title || "New chat").toLowerCase().includes(query.toLowerCase())
      ),
    [chats, query]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Account header */}
      <div className="flex items-center gap-3 border-b border-white/10 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black font-semibold">
          CK
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">CareIQ Guest</div>
          <div className="truncate text-xs text-white/50">guest@careiq.local</div>
        </div>
        <button
          onClick={onNewChat}
          className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-inset ring-white/10 placeholder:text-white/40 focus:ring-2 focus:ring-white/20"
        />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.map((c) => (
          <ChatRow
            key={c.id}
            chat={c}
            active={c.id === activeId}
            onSelect={() => onSelectChat(c.id)}
            onRename={(title) => onRenameChat(c.id, title)}
            onDelete={() => onDeleteChat(c.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="p-3 text-center text-xs text-white/50">No chats</div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 text-xs text-white/50">
        <div className="flex items-center justify-between">
          <span>Settings</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5">v0.1</span>
        </div>
      </div>
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(chat.title || "New chat");

  return (
    <div
      className={`group mb-1 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-white/5 ${
        active ? "bg-white/10" : ""
      }`}
      onClick={() => !editing && onSelect()}
    >
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px]">
        💬
      </div>
      {editing ? (
        <input
          className="w-full rounded bg-white/10 px-2 py-1 outline-none"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            onRename(val.trim() || "New chat");
            setEditing(false);
          }}
          autoFocus
        />
      ) : (
        <div className="min-w-0 flex-1 truncate">{chat.title || "New chat"}</div>
      )}
      <div className="ml-auto hidden gap-1 group-hover:flex">
        <button
          aria-label="Rename"
          className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          Rename
        </button>
        <button
          aria-label="Delete"
          className="rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
