"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Chat } from "@/types";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Sidebar
 * - Light mode default; supports Dark/System via Settings
 * - Desktop: collapsible rail (w-16) ↔ full (w-72)
 * - Mobile: slide-over drawer with backdrop
 * - Cmd/Ctrl+B to toggle
 * - Search chats
 * - Grouped sections (Today / Yesterday / Previous 7 days / Older)
 * - Hover actions (rename/delete)
 * - Settings footer includes Theme selector
 */
export default function Sidebar({
  chats,
  activeId,
  collapsed,
  onToggleSidebar,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}: {
  chats: Chat[];
  activeId: string | null;
  collapsed: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onToggleSidebar();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleSidebar]);

  // Filter + sort + group
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = chats
      .slice()
      .sort((a: any, b: any) => {
        const aTime =
          (a.updated_at ? new Date(a.updated_at).getTime() : 0) ||
          (a.created_at ? new Date(a.created_at).getTime() : 0);
        const bTime =
          (b.updated_at ? new Date(b.updated_at).getTime() : 0) ||
          (b.created_at ? new Date(b.created_at).getTime() : 0);
        return bTime - aTime;
      })
      .filter((c) =>
        q ? (c.title || "New chat").toLowerCase().includes(q) : true
      );
    return base;
  }, [chats, query]);

  const groups = useMemo(() => groupChatsByDate(filtered), [filtered]);

  // Mobile backdrop (open when not collapsed on small screens)
  const showMobileBackdrop = !collapsed;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 dark:bg-black/50 backdrop-blur-sm transition-opacity md:hidden ${
          showMobileBackdrop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onToggleSidebar}
        aria-hidden={!showMobileBackdrop}
      />

      {/* Sidebar Panel */}
      <aside
        className={[
          // Base box (light by default)
          "relative z-50 flex h-full flex-col border-r bg-white",
          "border-black/10",
          // Dark override
          "dark:bg-[#0b0b0b] dark:border-white/10",
          // Subtle translucency when supported
          "supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:backdrop-blur",
          "dark:supports-[backdrop-filter]:bg-[#0b0b0b]/80",
          // Widths
          collapsed ? "w-16" : "w-72",
          // Mobile slide-over
          "md:static md:translate-x-0 fixed inset-y-0 left-0 transition-all duration-200",
          collapsed ? "md:translate-x-0 -translate-x-full md:fixed-none" : "translate-x-0",
          "md:flex"
        ].join(" ")}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Header: Toggle + Logo */}
        <div
          className={`flex items-center ${
            collapsed ? "justify-center gap-2" : "justify-between"
          } border-b p-3 border-black/10 dark:border-white/10`}
        >
          <IconButton
            onClick={onToggleSidebar}
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand (⌘/Ctrl+B)" : "Collapse (⌘/Ctrl+B)"}
          >
            <ChevronLeft className={`${collapsed ? "" : "rotate-180"} transition-transform`} />
          </IconButton>

          {!collapsed && (
            <Link
              href="/"
              className="ml-2 flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-black/10 dark:hover:bg-white/5 dark:focus:ring-white/20"
              aria-label="Go to Home"
            >
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-black text-white font-bold dark:bg-white dark:text-black">
                CQ
              </div>
              <span className="select-none text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                CareIQ
              </span>
            </Link>
          )}

          {/* Close button (mobile only) */}
          {!collapsed && (
            <div className="md:hidden ml-auto">
              <IconButton onClick={onToggleSidebar} label="Close sidebar" title="Close">
                <CloseIcon />
              </IconButton>
            </div>
          )}
        </div>

        {/* New Chat */}
        <div className={`w-full border-b ${collapsed ? "px-2 py-3" : "px-3 py-3"} border-black/10 dark:border-white/10`}>
          <button
            onClick={onNewChat}
            className={[
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm",
              "bg-black/[0.05] hover:bg-black/[0.08] focus:outline-none focus:ring-2 focus:ring-black/10",
              "dark:bg-white/10 dark:hover:bg-white/15 dark:focus:ring-white/20",
              collapsed ? "justify-center" : ""
            ].join(" ")}
            title="New Chat"
            aria-label="Start a new chat"
          >
            <PlusIcon />
            {!collapsed && <span className="font-medium text-gray-900 dark:text-white">New Chat</span>}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="w-full p-3">
            <label className="sr-only" htmlFor="chat-search">
              Search chats
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500 dark:text-white">
                <SearchIcon />
              </div>
              <input
                id="chat-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats"
                className={[
                  "w-full rounded-xl pl-9 pr-3 py-2 text-sm outline-none ring-1 ring-inset",
                  "bg-white placeholder:text-gray-400 text-gray-900 ring-black/10",
                  "focus:ring-2 focus:ring-black/20",
                  "dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 dark:ring-white/10 dark:focus:ring-white/20",
                ].join(" ")}
              />
            </div>
          </div>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {filtered.length === 0 && !collapsed && (
            <div className="p-3 text-center text-xs text-gray-500 dark:text-white/50">No chats</div>
          )}

          {collapsed ? (
            // Collapsed: just dots
            <div className="pt-2">
              {filtered.map((c) => (
                <CollapsedChatDot
                  key={c.id}
                  title={c.title || "New chat"}
                  active={c.id === activeId}
                  onClick={() => onSelectChat(c.id)}
                />
              ))}
            </div>
          ) : (
            // Expanded: grouped sections
            <div className="space-y-3 pt-1">
              {groups.map((g) => (
                <Section key={g.key} title={g.label}>
                  {g.items.map((chat) => (
                    <ChatRow
                      key={chat.id}
                      chat={chat}
                      active={chat.id === activeId}
                      onSelect={() => onSelectChat(chat.id)}
                      onRename={(title) => onRenameChat(chat.id, title)}
                      onDelete={() => onDeleteChat(chat.id)}
                    />
                  ))}
                </Section>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Account / Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className={[
            "group flex w-full items-center gap-3 border-t p-3 text-left",
            "hover:bg-black/[0.04] focus:outline-none focus:ring-2 focus:ring-black/10",
            "border-black/10",
            "dark:hover:bg-white/5 dark:focus:ring-white/20 dark:border-white/10",
            collapsed ? "justify-center" : ""
          ].join(" ")}
          aria-label="Open settings"
          title="Settings"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white font-semibold dark:bg-white dark:text-black">
            CK
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">CareIQ Guest</div>
                <div className="truncate text-xs text-gray-500 dark:text-white/50">guest@careiq.local</div>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 group-hover:text-gray-700 dark:text-white/50 dark:group-hover:text-white/70">
                <SettingsIcon />
                Settings
              </span>
            </>
          )}
        </button>
      </aside>

      {/* Settings modal (with Theme selector) */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

/* ---------- Helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/40">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div
      className={[
        "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm",
        "hover:bg-black/[0.04] dark:hover:bg-white/5",
        active ? "bg-black/[0.06] dark:bg-white/10" : ""
      ].join(" ")}
      onClick={() => !editing && onSelect()}
    >
      <div className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-black/[0.06] text-gray-700 dark:bg-white/10 dark:text-white">
        <ChatBubbleIcon />
      </div>

      {editing ? (
        <input
          ref={inputRef}
          className="w-full rounded bg-black/[0.06] px-2 py-1 outline-none text-gray-900 dark:bg-white/10 dark:text-white"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            const next = val.trim() || "New chat";
            onRename(next);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const next = val.trim() || "New chat";
              onRename(next);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setVal(chat.title || "New chat");
              setEditing(false);
            }
          }}
        />
      ) : (
        <div className="min-w-0 flex-1 truncate text-gray-900 dark:text-white">
          {chat.title || "New chat"}
        </div>
      )}

      {/* Hover actions */}
      <div className="ml-auto hidden items-center gap-1 group-hover:flex">
        <IconGhostButton
          ariaLabel="Rename"
          title="Rename"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          <EditIcon />
        </IconGhostButton>
        <IconGhostButton
          ariaLabel="Delete"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <TrashIcon />
        </IconGhostButton>
      </div>
    </div>
  );
}

function CollapsedChatDot({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="mb-2 flex w-full items-center justify-center"
      aria-label={title}
    >
      <div
        className={`h-7 w-7 rounded-lg grid place-items-center text-xs
        ${active
          ? "bg-black text-white dark:bg-white dark:text-black"
          : "bg-black/[0.06] text-gray-700 dark:bg-white/10 dark:text-white"}`}
      >
        <ChatBubbleIcon />
      </div>
    </button>
  );
}

/* ---------- Settings Modal with Theme selector ---------- */

function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, resolved, setTheme } = useTheme();

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
      className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div
        className="mx-auto mt-24 w-[92%] max-w-md rounded-2xl border p-4 shadow-2xl bg-white border-black/10 dark:bg-[#0b0b0b] dark:border-white/10"
        onClick={stop}
      >
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white font-bold dark:bg-white dark:text-black">
            CQ
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Settings</div>
          <button
            onClick={onClose}
            className="ml-auto rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-black/[0.04] hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="rounded-xl border p-3 border-black/10 dark:border-white/10">
            <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Account</div>
            <div className="font-medium text-gray-900 dark:text-white">CareIQ Guest</div>
            <div className="text-gray-600 dark:text-white/60">guest@careiq.local</div>
          </div>

          {/* Theme */}
          <div className="rounded-xl border p-3 border-black/10 dark:border-white/10">
            <div className="mb-2 text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Appearance</div>
            <fieldset className="space-y-2">
              <ThemeOption
                id="theme-light"
                label="Light"
                description="Bright background with dark text"
                checked={theme === "light"}
                onChange={() => setTheme("light")}
              />
              <ThemeOption
                id="theme-dark"
                label="Dark"
                description="Dim background with light text"
                checked={theme === "dark"}
                onChange={() => setTheme("dark")}
              />
              <ThemeOption
                id="theme-system"
                label="System"
                description={`Follows your OS preference (currently ${resolved})`}
                checked={theme === "system"}
                onChange={() => setTheme("system")}
              />
            </fieldset>
          </div>

          <div className="rounded-xl border p-3 border-black/10 dark:border-white/10">
            <div className="mb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">App</div>
            <div className="flex items-center justify-between text-gray-900 dark:text-white">
              <span>Version</span>
              <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-xs text-gray-700 dark:bg-white/10 dark:text-white/80">v0.1</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black/20 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3",
        checked
          ? "border-black/30 bg-black/[0.04] dark:border-white/30 dark:bg-white/10"
          : "border-black/10 hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/5",
      ].join(" ")}
    >
      <input
        id={id}
        type="radio"
        name="theme"
        className="mt-0.5"
        checked={checked}
        onChange={onChange}
      />
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{label}</div>
        <div className="text-xs text-gray-600 dark:text-white/60">{description}</div>
      </div>
    </label>
  );
}

/* ---------- Small UI components ---------- */

function IconButton({
  onClick,
  label,
  title,
  children,
}: {
  onClick: () => void;
  label: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={title || label}
      className="rounded-lg p-2 bg-black/[0.05] hover:bg-black/[0.08] focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-white/10 dark:hover:bg-white/15 dark:focus:ring-white/20"
    >
      {children}
    </button>
  );
}

function IconGhostButton({
  onClick,
  ariaLabel,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className="rounded-md p-1 text-gray-700 hover:bg-black/[0.06] hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-white/20"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* ---------- Icons (inline SVG, no deps) ---------- */

function ChevronLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H8l-4 4v-4a8 8 0 1 1 17-4z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.69 0 1.31-.39 1.61-1a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 7.14 4.2l.06.06c.51.51 1.25.66 1.9.4.63-.25 1.04-.86 1.04-1.55V3a2 2 0 1 1 4 0v.09c0 .69.41 1.3 1.04 1.55.65.26 1.39.11 1.9-.4l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06c-.51.51-.66 1.25-.4 1.9.25.63.86 1.04 1.55 1.04H21a2 2 0 1 1 0 4h-.09c-.69 0-1.3.41-1.55 1.04z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* ---------- Grouping logic ---------- */

function groupChatsByDate(items: Chat[]) {
  const hasTime = items.some((c: any) => c.updated_at || c.created_at);
  if (!hasTime) {
    return [{ key: "recent", label: "Recent", items }];
  }

  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const todayStart = startOf(now).getTime();
  const yestStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const buckets: Record<"today" | "yesterday" | "week" | "older", Chat[]> = {
    today: [], yesterday: [], week: [], older: []
  };

  items.forEach((c: any) => {
    const t =
      (c.updated_at ? new Date(c.updated_at).getTime() : 0) ||
      (c.created_at ? new Date(c.created_at).getTime() : 0);

    if (t >= todayStart) buckets.today.push(c);
    else if (t >= yestStart && t < todayStart) buckets.yesterday.push(c);
    else if (t >= weekStart && t < yestStart) buckets.week.push(c);
    else buckets.older.push(c);
  });

  const out: Array<{ key: string; label: string; items: Chat[] }> = [];
  if (buckets.today.length) out.push({ key: "today", label: "Today", items: buckets.today });
  if (buckets.yesterday.length) out.push({ key: "yesterday", label: "Yesterday", items: buckets.yesterday });
  if (buckets.week.length) out.push({ key: "week", label: "Previous 7 days", items: buckets.week });
  if (buckets.older.length) out.push({ key: "older", label: "Older", items: buckets.older });

  return out;
}
