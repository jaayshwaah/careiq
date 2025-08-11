"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Chat } from "@/types";

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const filtered = useMemo(
    () =>
      chats.filter((c) =>
        (c.title || "New chat").toLowerCase().includes(query.toLowerCase())
      ),
    [chats, query]
  );

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header: Logo + New Chat */}
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Go to Home"
          >
            {/* Placeholder logo — swap with your SVG when ready */}
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-white text-black font-bold">
              CQ
            </div>
            <span className="select-none text-sm font-semibold tracking-tight">
              CareIQ
            </span>
          </Link>

          <button
            onClick={onNewChat}
            className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-medium text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/20"
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

        {/* Footer: Account row opens Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="group flex items-center gap-3 border-t border-white/10 p-4 text-left hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Open settings"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black font-semibold">
            CK
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">CareIQ Guest</div>
            <div className="truncate text-xs text-white/50">guest@careiq.local</div>
          </div>
          <span className="ml-auto text-xs text-white/50 group-hover:text-white/70">
            Settings
          </span>
        </button>
      </div>

      {/* Settings modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
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

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="mx-auto mt-24 w-[92%] max-w-md rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 shadow-2xl"
        onClick={stop}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black font-bold">
            CQ
          </div>
          <div className="text-sm font-semibold">Settings</div>
          <button
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-white/10 p-3">
            <div className="mb-1 text-xs uppercase tracking-wide text-white/50">
              Account
            </div>
            <div className="font-medium">CareIQ Guest</div>
            <div className="text-white/60">guest@careiq.local</div>
          </div>

          <div className="rounded-xl border border-white/10 p-3">
            <div className="mb-1 text-xs uppercase tracking-wide text-white/50">
              App
            </div>
            <div className="flex items-center justify-between">
              <span>Version</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">v0.1</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-white/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
