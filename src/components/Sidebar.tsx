// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  PanelsTopLeft,
  Search as SearchIcon,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  Settings,
  User,
  LogOut,
  PencilLine,
  CalendarDays,
  Paperclip,
  Loader2,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import AccountMenu from "./AccountMenu";

/* ---------------------------------- Types --------------------------------- */

type ChatMetaRow = {
  id: string;
  title: string | null;
  created_at: string | null;
  last_message_at: string | null;
  has_attachments: boolean | null;
};

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

/* ----------------------------- Local constants ---------------------------- */

// Legacy key (we migrate these to server once)
const LEGACY_PIN_STORAGE_KEY = "careiq.pinnedChatIds.v1";
const AUTOTITLE_MARK = "careiq.autotitle.done.v1";
// Generous rate limits (per action key)
const RL_DEFAULT_MAX = 30; // 30 actions
const RL_DEFAULT_WINDOW_MS = 60_000; // per minute

/* ------------------------------- Utilities -------------------------------- */

function getAutotitleMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(AUTOTITLE_MARK);
    if (!raw) return {};
    const map = JSON.parse(raw);
    return map && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

function setAutotitleDone(id: string) {
  try {
    const map = getAutotitleMap();
    map[id] = Date.now();
    localStorage.setItem(AUTOTITLE_MARK, JSON.stringify(map));
  } catch {}
}

function isLikelyUntitled(title: string | null | undefined) {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return !t || t === "new chat";
}

function isActiveChat(pathname: string | null, id: string) {
  if (!pathname) return false;
  return pathname === `/chat/${id}`;
}

/* ----------------------------- Rate Limiter ------------------------------- */

function rlKey(key: string) {
  return `careiq.rl.${key}`;
}
function allowAction(key: string, max = RL_DEFAULT_MAX, windowMs = RL_DEFAULT_WINDOW_MS) {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(rlKey(key));
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const recent = arr.filter((t) => now - t < windowMs);
    if (recent.length >= max) return false;
    recent.push(now);
    localStorage.setItem(rlKey(key), JSON.stringify(recent));
    return true;
  } catch {
    return true; // fail-open if storage blocked
  }
}

/* ----------------------- Cross-tab typing indicator ----------------------- */

type TypingSignal = { chatId: string; typing: boolean };

function useTypingPresence() {
  const [typingIds, setTypingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const update = ({ chatId, typing }: TypingSignal) => {
      setTypingIds((prev) => {
        const next = new Set(prev);
        if (typing) next.add(chatId);
        else next.delete(chatId);
        return next;
      });
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("careiq-typing");
      bc.onmessage = (ev) => {
        if (!ev?.data) return;
        update(ev.data as TypingSignal);
      };
    } catch {}

    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent).detail as TypingSignal | undefined;
      if (detail) update(detail);
    };
    window.addEventListener("chat:typing", onEvt as any);
    window.addEventListener("chat:done", onEvt as any);

    return () => {
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      window.removeEventListener("chat:typing", onEvt as any);
      window.removeEventListener("chat:done", onEvt as any);
    };
  }, []);

  return typingIds;
}

/* --------------------------- Tiny popover menu ---------------------------- */

function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onOutside]);
  return ref;
}

function TinyMenu({
  open,
  onClose,
  align = "start",
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "start" | "end";
  children: React.ReactNode;
}) {
  const ref = useOutsideClick<HTMLDivElement>(() => onClose());
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 min-w-[220px] rounded-2xl border border-black/10 bg-white p-1 text-sm shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-white/10 dark:bg-neutral-900/90",
        align === "end" ? "right-0" : "left-0"
      )}
      role="menu"
    >
      {children}
    </div>
  );
}

function TinyMenuItem({
  icon,
  children,
  danger,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        danger && "text-red-600 dark:text-red-400"
      )}
      role="menuitem"
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

/* -------------------------------- Chat row -------------------------------- */

function ChatItem({
  row,
  active,
  pinned,
  onPinToggle,
  onDelete,
  onRename,
  onIngest,
  showTyping,
}: {
  row: ChatMetaRow;
  active: boolean;
  pinned: boolean;
  showTyping?: boolean;
  onPinToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void; // optimistic
  onIngest: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(row.title || "New chat");
  const [savingRename, setSavingRename] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (renaming) setTimeout(() => inputRef.current?.focus(), 10);
  }, [renaming]);

  useEffect(() => {
    if (!renaming) setTitleInput(row.title || "New chat");
  }, [row.title, renaming]);

  const submitRename = () => {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === (row.title || "New chat")) {
      setRenaming(false);
      return;
    }
    if (!allowAction("rename", 60, 60_000)) {
      alert("You are renaming too quickly. Please wait a bit.");
      return;
    }
    setSavingRename(true);
    onRename(row.id, trimmed); // optimistic update
    setRenaming(false);
    setSavingRename(false);
  };

  const editResend = () => {
    const detail = { chatId: row.id };
    try {
      window.dispatchEvent(new CustomEvent("chat:edit-resend", { detail }));
    } catch {}
  };

  return (
    <li
      className={cn(
        "group relative rounded-2xl",
        active
          ? "bg-neutral-100 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10"
          : "hover:bg-white/60 dark:hover:bg-neutral-900/60"
      )}
    >
      {!renaming ? (
        <Link
          href={`/chat/${row.id}`}
          className={cn(
            "flex items-center gap-2 truncate px-3 py-2 pr-10 text-sm",
            active && "font-medium"
          )}
          title={row.title || "New chat"}
        >
          {row.has_attachments ? (
            <span className="text-neutral-500" title="Has attachments">
              <Paperclip size={14} />
            </span>
          ) : null}
          <span className="truncate">{row.title || "New chat"}</span>
          <span className="ml-2 text-xs text-neutral-500">
            {row.last_message_at
              ? timeAgo(row.last_message_at)
              : row.created_at
              ? timeAgo(row.created_at)
              : ""}
          </span>
          {showTyping && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-neutral-500">
              <Loader2 className="animate-spin" size={12} />
              typing…
            </span>
          )}
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 pr-10">
          <input
            ref={inputRef}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="w-full rounded-xl border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-950"
          />
          <button
            className="rounded-lg px-2 py-1 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => setRenaming(false)}
            disabled={savingRename}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800 dark:bg白 dark:text-black"
            onClick={submitRename}
            disabled={savingRename}
          >
            {savingRename ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {!renaming && (
        <div className="absolute inset-y-0 right-1 flex items-center gap-1">
          <button
            className={cn(
              "invisible rounded-md p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 group-hover:visible dark:hover:bg-neutral-800",
              pinned && "visible"
            )}
            aria-label={pinned ? "Unpin chat" : "Pin chat"}
            onClick={(e) => {
              e.preventDefault();
              if (!allowAction("pin", 80, 60_000)) return;
              onPinToggle(row.id);
            }}
            title={pinned ? "Unpin" : "Pin"}
          >
            {pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>

          <div className="relative">
            <button
              className="invisible rounded-md p-1 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 group-hover:visible dark:hover:bg-neutral-800"
              aria-label="More"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((v) => !v);
                setConfirmDelete(false);
              }}
              title="More"
            >
              <MoreHorizontal size={16} />
            </button>

            <TinyMenu open={menuOpen} onClose={() => setMenuOpen(false)} align="end">
              {!confirmDelete ? (
                <>
                  <TinyMenuItem
                    icon={<PencilLine size={16} />}
                    onClick={() => {
                      setRenaming(true);
                      setMenuOpen(false);
                    }}
                  >
                    Rename
                  </TinyMenuItem>
                  <TinyMenuItem
                    icon={<Paperclip size={16} />}
                    onClick={() => {
                      onIngest(row.id);
                      setMenuOpen(false);
                    }}
                  >
                    Ingest attachments
                  </TinyMenuItem>
                  <TinyMenuItem
                    icon={<Loader2 size={16} />}
                    onClick={() => {
                      editResend();
                      setMenuOpen(false);
                    }}
                  >
                    Edit &amp; Resend last
                  </TinyMenuItem>
                  <TinyMenuItem
                    icon={<Pin size={16} />}
                    onClick={() => {
                      if (!allowAction("pin", 80, 60_000)) {
                        alert("Too many pin/unpin actions right now.");
                        return;
                      }
                      onPinToggle(row.id);
                      setMenuOpen(false);
                    }}
                  >
                    {pinned ? "Unpin" : "Pin"}
                  </TinyMenuItem>
                  <div className="my-1 h-px w-full bg-neutral-100 dark:bg-neutral-800" />
                  <TinyMenuItem
                    icon={<Trash2 size={16} />}
                    danger
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete…
                  </TinyMenuItem>
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                    Delete this chat? This can’t be undone.
                  </div>
                  <div className="flex gap-2 p-1">
                    <button
                      className="flex-1 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-sm text-white hover:bg-red-700"
                      onClick={() => {
                        if (!allowAction("delete", 20, 60_000)) {
                          alert("You’re deleting too quickly. Please slow down.");
                          return;
                        }
                        onDelete(row.id);
                        setMenuOpen(false);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </TinyMenu>
          </div>
        </div>
      )}
    </li>
  );
}

/* -------------------------- Auto Title background ------------------------- */
/**
 * Finds untitled chats and asks /api/title (cheap model) to name them,
 * then PATCHes /api/chats/:id. Marks done in localStorage to avoid repeats.
 */
function AutoTitleAgent() {
  const supabase = getBrowserSupabase();
  useEffect(() => {
    let cancelled = false;
    let ticking = false;

    async function attempt() {
      if (ticking) return;
      ticking = true;
      try {
        const { data: chats } = await supabase
          .from("chats")
          .select("id,title,created_at")
          .order("created_at", { ascending: false })
          .limit(25);

        const done = getAutotitleMap();
        for (const c of chats || []) {
          if (cancelled) break;
          const id = c.id as string;
          if (!isLikelyUntitled(c.title)) continue;
          if (done[id]) continue;

          const { data: msgs } = await supabase
            .from("messages")
            .select("role,content,created_at")
            .eq("chat_id", id)
            .order("created_at", { ascending: true })
            .limit(10);

          const firstUser = (msgs || []).find((m: any) => m.role === "user") as
            | { content: string }
            | undefined;

          const seed = firstUser?.content?.trim();
          if (!seed) {
            setAutotitleDone(id);
            continue;
          }

          let title = "New chat";
          try {
            const tr = await fetch("/api/title", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: seed }),
            });
            const tj = await tr.json();
            title = (tj?.title || "New chat").slice(0, 60);
          } catch {}

          try {
            await fetch(`/api/chats/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title }),
            });
          } catch {}

          setAutotitleDone(id);
        }
      } finally {
        ticking = false;
      }
    }

    attempt();
    const t = setInterval(attempt, 20_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [supabase]);

  return null;
}

/* --------------------------------- Sidebar -------------------------------- */

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMetaRow[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // typing indicator
  const typingIds = useTypingPresence();

  // prevent nested scroll-jank: sidebar handles its own scroll, independent of chat pane
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.style.overscrollBehavior = "contain";
  }, []);

  /* ------------------------ Auth + server pin migration ------------------------ */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;
      setUserId(uid);

      // migrate legacy local pins to server once
      if (uid) {
        try {
          const raw = localStorage.getItem(LEGACY_PIN_STORAGE_KEY);
          if (raw) {
            const legacy = JSON.parse(raw) as string[];
            if (Array.isArray(legacy) && legacy.length) {
              // fetch existing pins to avoid duplicates
              const { data: existing } = await supabase
                .from("pins")
                .select("chat_id")
                .eq("user_id", uid);
              const existingSet = new Set((existing || []).map((p: any) => p.chat_id as string));
              const toInsert = legacy
                .filter((id) => !existingSet.has(id))
                .map((chat_id) => ({ user_id: uid, chat_id }));

              if (toInsert.length) {
                await supabase.from("pins").insert(toInsert);
              }
            }
            // clear legacy storage after migration
            localStorage.removeItem(LEGACY_PIN_STORAGE_KEY);
          }
        } catch {
          // ignore
        }
      }
    })();
  }, [supabase]);

  /* ------------------------------- Fetch data ------------------------------- */

  const fetchChats = useCallback(async () => {
    const { data, error } = await supabase
      .from("chat_meta")
      .select("id,title,created_at,last_message_at,has_attachments")
      .order("last_message_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (!error) setChats((data || []) as ChatMetaRow[]);
  }, [supabase]);

  const fetchPins = useCallback(
    async (uid: string | null) => {
      if (!uid) {
        setPinnedIds([]);
        return;
      }
      const { data, error } = await supabase.from("pins").select("chat_id").eq("user_id", uid);
      if (!error) setPinnedIds((data || []).map((r: any) => r.chat_id as string));
    },
    [supabase]
  );

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    fetchPins(userId);
  }, [fetchPins, userId]);

  /* ------------------------------ Realtime sync ----------------------------- */

  useEffect(() => {
    // Realtime for chats/messages to refresh the meta view
    const channel = supabase
      .channel("sidebar-meta")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chats" },
        () => fetchChats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchChats()
      )
      .subscribe();

    // Realtime for pins (user-scoped)
    const pinsChannel = supabase
      .channel("sidebar-pins")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pins", filter: userId ? `user_id=eq.${userId}` : undefined },
        () => fetchPins(userId)
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
        supabase.removeChannel(pinsChannel);
      } catch {}
    };
  }, [supabase, fetchChats, fetchPins, userId]);

  /* --------------------------- Derived + handlers --------------------------- */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => (c.title || "New chat").toLowerCase().includes(q));
  }, [query, chats]);

  const pinned = useMemo(
    () => filtered.filter((c) => pinnedIds.includes(c.id)),
    [filtered, pinnedIds]
  );
  const recent = useMemo(
    () => filtered.filter((c) => !pinnedIds.includes(c.id)),
    [filtered, pinnedIds]
  );

  async function handleDelete(id: string) {
    if (!allowAction("delete", 20, 60_000)) {
      alert("You’re deleting too quickly. Please slow down.");
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== id));
    // unpin if pinned
    if (userId) {
      setPinnedIds((prev) => prev.filter((p) => p !== id));
      await supabase.from("pins").delete().eq("user_id", userId).eq("chat_id", id);
    }
    fetch(`/api/chats/${id}`, { method: "DELETE" }).catch(() => {});
    if (isActiveChat(pathname, id)) router.push("/chat/new");
  }

  async function togglePin(id: string) {
    if (!allowAction("pin", 80, 60_000)) {
      alert("Too many pin/unpin actions right now.");
      return;
    }
    if (!userId) {
      alert("Please sign in to pin chats.");
      return;
    }
    const isPinned = pinnedIds.includes(id);
    if (isPinned) {
      setPinnedIds((prev) => prev.filter((x) => x !== id));
      await supabase.from("pins").delete().eq("user_id", userId).eq("chat_id", id);
    } else {
      setPinnedIds((prev) => [id, ...prev]);
      await supabase.from("pins").insert({ user_id: userId, chat_id: id });
    }
  }

  async function handleNewChat() {
    if (!allowAction("newchat", 40, 60_000)) {
      alert("You’ve created a lot of chats in a short time—try again soon.");
      return;
    }
    const res = await fetch("/api/chats", { method: "POST" });
    const json = await res.json();
    const newId = json.id as string;
    // optimistic add (chat_meta will soon reflect it)
    setChats((prev) => [
      {
        id: newId,
        title: "New chat",
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        has_attachments: false,
      },
      ...prev,
    ]);
    router.push(`/chat/${newId}`);
  }

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    if (!allowAction("rename", 60, 60_000)) {
      alert("You’re renaming too fast. Please wait a bit.");
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));
    fetch(`/api/chats/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    }).catch((err) => console.error("Rename sync failed", err));
  }, []);

  const handleIngest = useCallback(async (id: string) => {
    if (!allowAction("ingest", 15, 60_000)) {
      alert("Ingestion rate limit reached temporarily. Try again shortly.");
      return;
    }
    try {
      const r = await fetch(`/api/ingest?chat_id=${encodeURIComponent(id)}`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      // optional: toast success
    } catch (e) {
      console.warn("Ingest failed", e);
      alert("Ingestion failed to start. Check server logs for details.");
    }
  }, []);

  return (
    <aside
      className={cn(
        "relative h-svh shrink-0 transition-[width] duration-300 ease-ios",
        collapsed ? "w-[76px]" : "w-[300px]"
      )}
    >
      <AutoTitleAgent />
      <div className="sticky top-0 h-svh p-2 sm:p-3">
        <div className="glass relative flex h-full flex-col overflow-hidden rounded-2xl ring-1 ring-black/10 backdrop-blur supports-[backdrop-filter]:bg-white/55 dark:ring-white/10 dark:backdrop-blur">
          {/* Top bar */}
          <div className="flex items-center justify-between px-2 py-2">
            <button
              className="rounded-xl p-2 hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <PanelsTopLeft size={18} />
            </button>
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2 px-2 py-1">
                <Image alt="CareIQ" src="/logo.svg" width={24} height={24} priority />
                <span className="text-sm font-semibold tracking-tight">CareIQ</span>
              </Link>
            )}
            <div className="ml-auto">
              <AccountMenu />
            </div>
          </div>

          {/* Search + New Chat */}
          <div className={cn("px-2 pb-2", collapsed && "px-1")}>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search chats…"
                      className="w-full rounded-xl border border-neutral-200 bg-white py-2 pl-8 pr-3 text-sm outline-none dark:border-neutral-800 dark:bg-neutral-950"
                    />
                  </div>
                </div>
                <button
                  onClick={handleNewChat}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950"
                >
                  <div className="flex items-center gap-1">
                    <Plus size={16} />
                    New chat
                  </div>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <button
                  onClick={handleNewChat}
                  className="rounded-xl border border-neutral-200 bg-white p-2 shadow-sm hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Lists */}
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto px-2 pb-2">
            {/* Pinned */}
            {!collapsed && pinned.length > 0 && (
              <div className="mb-2">
                <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Pinned
                </div>
                <ul className="space-y-1">
                  {pinned.map((row) => (
                    <ChatItem
                      key={row.id}
                      row={row}
                      active={isActiveChat(pathname, row.id)}
                      pinned
                      onPinToggle={togglePin}
                      onDelete={handleDelete}
                      onRename={handleRename}
                      onIngest={handleIngest}
                      showTyping={typingIds.has(row.id) && isActiveChat(pathname, row.id)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Recent */}
            <div className={!collapsed ? "mt-1" : ""}>
              {!collapsed && (
                <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Recent
                </div>
              )}
              <ul className={cn("space-y-1", collapsed && "px-1")}>
                {recent.length === 0 && !collapsed ? (
                  <li className="px-3 py-2 text-sm text-neutral-500">No chats yet.</li>
                ) : (
                  recent.map((row) => (
                    <ChatItem
                      key={row.id}
                      row={row}
                      active={isActiveChat(pathname, row.id)}
                      pinned={false}
                      onPinToggle={togglePin}
                      onDelete={handleDelete}
                      onRename={handleRename}
                      onIngest={handleIngest}
                      showTyping={typingIds.has(row.id) && isActiveChat(pathname, row.id)}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Modules at the bottom */}
          <div className={cn("mt-auto px-2 pb-2")}>
            {!collapsed && (
              <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Modules
              </div>
            )}
            <div className={cn("flex flex-col gap-1", collapsed && "items-center")}>
              <Link
                href="/calendar"
                className={cn(
                  "flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-3 py-2 text-sm shadow-sm hover:bg-white",
                  collapsed && "justify-center px-2"
                )}
                title="Compliance Calendar"
              >
                <CalendarDays className="h-4 w-4" />
                {!collapsed && <span>Compliance Calendar</span>}
              </Link>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white/80 px-3 py-2 text-sm shadow-sm hover:bg-white",
                  collapsed && "justify-center px-2"
                )}
                title="Settings"
              >
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-black/5 px-2 py-2 text-xs text-neutral-500 dark:border-white/5">
            {!collapsed ? (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  Signed in
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/settings" className="flex items-center gap-1 hover:underline">
                    <Settings size={14} />
                    Settings
                  </Link>
                  <button className="flex items-center gap-1 hover:underline" title="Log out">
                    <LogOut size={14} />
                    Log out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/settings"
                  title="Settings"
                  className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Settings size={16} />
                </Link>
                <button title="Log out" className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
