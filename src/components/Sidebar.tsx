/* 
   FILE: src/components/Sidebar.tsx
   Fixed version - replace entire file
*/

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
  Sparkles,
  Home,
  MessageCircle,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { ThemeToggle } from "@/components/ThemeProvider";

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

const LEGACY_PIN_STORAGE_KEY = "careiq.pinnedChatIds.v1";
const AUTOTITLE_MARK = "careiq.autotitle.done.v1";
const RL_DEFAULT_MAX = 30;
const RL_DEFAULT_WINDOW_MS = 60_000;

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
    return true;
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

/* --------------------------- Enhanced popover menu ---------------------------- */

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
        "absolute z-50 mt-2 min-w-[220px] glass rounded-2xl p-2 text-sm animate-scaleIn",
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
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-[var(--bg-overlay)] active:scale-95",
        danger && "text-[var(--accent-red)]"
      )}
      role="menuitem"
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}

/* -------------------------------- Enhanced Chat Item -------------------------------- */

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
  onRename: (id: string, newTitle: string) => void;
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
    onRename(row.id, trimmed);
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
        "group relative rounded-2xl mx-2 mb-2 transition-all duration-300",
        active
          ? "glass shadow-[var(--shadow-md)] scale-[1.02]"
          : "hover:bg-[var(--bg-overlay)] hover:translate-x-1"
      )}
    >
      {!renaming ? (
        <Link
          href={`/chat/${row.id}`}
          className="flex items-center gap-3 truncate px-4 py-3 text-sm relative z-10"
          title={row.title || "New chat"}
        >
          <div className="flex-shrink-0">
            {row.has_attachments ? (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent-blue)]/20 to-[var(--accent-purple)]/20 flex items-center justify-center border border-[var(--border-secondary)]">
                <Paperclip size={14} className="text-[var(--accent-blue)]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-overlay)] flex items-center justify-center">
                <MessageCircle size={14} className="text-[var(--text-secondary)]" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className={cn(
              "truncate font-medium transition-colors",
              active ? "text-[var(--text-primary)]" : "text-[var(--text-primary)]"
            )}>
              {row.title || "New chat"}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1 flex items-center gap-2">
              <span>
                {row.last_message_at
                  ? timeAgo(row.last_message_at)
                  : row.created_at
                  ? timeAgo(row.created_at)
                  : ""}
              </span>
              {showTyping && (
                <span className="inline-flex items-center gap-1 text-[var(--accent-blue)]">
                  <Loader2 className="animate-spin" size={10} />
                  <span>typing...</span>
                </span>
              )}
            </div>
          </div>
          
          {pinned && (
            <Pin size={12} className="text-[var(--accent-blue)] flex-shrink-0" />
          )}
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3">
          <input
            ref={inputRef}
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="input-liquid text-sm"
            disabled={savingRename}
            placeholder="Chat title..."
          />
          <button
            className="btn-liquid-secondary text-xs px-3 py-1.5 min-w-fit"
            onClick={() => setRenaming(false)}
            disabled={savingRename}
          >
            Cancel
          </button>
          <button
            className="btn-liquid text-xs px-3 py-1.5 min-w-fit"
            onClick={submitRename}
            disabled={savingRename}
          >
            {savingRename ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {!renaming && (
        <div className="absolute inset-y-0 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-overlay)] hover:scale-110",
              pinned && "opacity-100 text-[var(--accent-blue)]"
            )}
            aria-label={pinned ? "Unpin chat" : "Pin chat"}
            onClick={(e) => {
              e.preventDefault();
              if (!allowAction("pin", 80, 60_000)) return;
              onPinToggle(row.id);
            }}
            title={pinned ? "Unpin" : "Pin"}
          >
            {pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>

          <div className="relative">
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-overlay)] hover:scale-110"
              aria-label="More options"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen((v) => !v);
                setConfirmDelete(false);
              }}
            >
              <MoreHorizontal size={14} />
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
                  <div className="my-1 h-px w-full bg-[var(--border-secondary)]" />
                  <TinyMenuItem
                    icon={<Trash2 size={16} />}
                    danger
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete...
                  </TinyMenuItem>
                </>
              ) : (
                <div className="p-2">
                  <div className="text-sm text-[var(--text-secondary)] mb-3">
                    Delete this chat? This can't be undone.
                  </div>
                  <div className="flex gap-2">
                    <button
                  onClick={handleNewChat}
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 focus-ring"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Chat Lists */}
          <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto py-2 scroll-area">
            {/* Pinned Chats */}
            {!collapsed && pinned.length > 0 && (
              <div className="mb-4">
                <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] flex items-center gap-2">
                  <Pin size={12} />
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

            {/* Recent Chats */}
            <div className="mb-4">
              {!collapsed && (
                <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)] flex items-center gap-2">
                  <MessageCircle size={12} />
                  Recent
                </div>
              )}
              <ul className="space-y-1">
                {recent.length === 0 && !collapsed ? (
                  <li className="px-4 py-8 text-center">
                    <div className="text-[var(--text-tertiary)] text-sm mb-2">No chats yet</div>
                    <button
                      onClick={handleNewChat}
                      className="text-[var(--accent-blue)] text-sm hover:underline"
                    >
                      Start your first conversation
                    </button>
                  </li>
                ) : (
                  recent.slice(0, collapsed ? 20 : 50).map((row) => (
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

          {/* Enhanced Footer with Navigation */}
          <div className="border-t border-[var(--border-secondary)] p-4">
            {!collapsed ? (
              <div className="space-y-3">
                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/calendar"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl glass hover:glass-heavy transition-all duration-200 hover:scale-105 text-sm"
                    title="Compliance Calendar"
                  >
                    <CalendarDays className="h-4 w-4 text-[var(--accent-green)]" />
                    <span className="truncate">Calendar</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl glass hover:glass-heavy transition-all duration-200 hover:scale-105 text-sm"
                    title="Settings"
                  >
                    <Settings className="h-4 w-4 text-[var(--text-secondary)]" />
                    <span className="truncate">Settings</span>
                  </Link>
                </div>

                {/* User Info */}
                <div className="flex items-center justify-between px-2 py-2 glass rounded-xl">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-blue)] to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                      <User size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        Signed in
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        CareIQ User
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-8 h-8 rounded-lg hover:bg-[var(--bg-overlay)] flex items-center justify-center transition-all duration-200 hover:scale-110 text-[var(--text-tertiary)] hover:text-[var(--accent-red)] focus-ring"
                    title="Sign out"
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut();
                        router.push("/login");
                      } catch (error) {
                        console.error("Sign out failed:", error);
                      }
                    }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/calendar"
                  title="Compliance Calendar"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all duration-200 focus-ring"
                >
                  <CalendarDays size={16} className="text-[var(--accent-green)]" />
                </Link>
                <Link
                  href="/settings"
                  title="Settings"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all duration-200 focus-ring"
                >
                  <Settings size={16} />
                </Link>
                <button
                  title="Sign out"
                  className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:scale-105 transition-all duration-200 text-[var(--text-tertiary)] hover:text-[var(--accent-red)] focus-ring"
                  onClick={async () => {
                    try {
                      await supabase.auth.signOut();
                      router.push("/login");
                    } catch (error) {
                      console.error("Sign out failed:", error);
                    }
                  }}
                >
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
                      className="btn-liquid-secondary flex-1 text-xs py-2"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="flex-1 rounded-xl bg-[var(--accent-red)] text-white text-xs py-2 px-3 hover:opacity-90 transition-all duration-200 active:scale-95"
                      onClick={() => {
                        if (!allowAction("delete", 20, 60_000)) {
                          alert("You're deleting too quickly. Please slow down.");
                          return;
                        }
                        onDelete(row.id);
                        setMenuOpen(false);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </TinyMenu>
          </div>
        </div>
      )}
    </li>
  );
}

/* -------------------------- Auto Title background ------------------------- */

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

/* --------------------------------- Main Sidebar -------------------------------- */

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getBrowserSupabase();

  const [userId, setUserId] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatMetaRow[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const typingIds = useTypingPresence();
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

      if (uid) {
        try {
          const raw = localStorage.getItem(LEGACY_PIN_STORAGE_KEY);
          if (raw) {
            const legacy = JSON.parse(raw) as string[];
            if (Array.isArray(legacy) && legacy.length) {
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
            localStorage.removeItem(LEGACY_PIN_STORAGE_KEY);
          }
        } catch {}
      }
    })();
  }, [supabase]);

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

  useEffect(() => {
    const channel = supabase
      .channel("sidebar-meta")
      .on("postgres_changes", { event: "*", schema: "public", table: "chats" }, () => fetchChats())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchChats())
      .subscribe();

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
      alert("You're deleting too quickly. Please slow down.");
      return;
    }
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (userId) {
      setPinnedIds((prev) => prev.filter((p) => p !== id));
      await supabase.from("pins").delete().eq("user_id", userId).eq("chat_id", id);
    }
    fetch(`/api/chats/${id}`, { method: "DELETE" }).catch(() => {});
    if (isActiveChat(pathname, id)) router.push("/");
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
      alert("You've created a lot of chats in a short time—try again soon.");
      return;
    }
    const res = await fetch("/api/chats", { method: "POST" });
    const json = await res.json();
    const newId = json.id as string;
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
      alert("You're renaming too fast. Please wait a bit.");
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
    } catch (e) {
      console.warn("Ingest failed", e);
      alert("Ingestion failed to start. Check server logs for details.");
    }
  }, []);

  return (
    <aside
      className={cn(
        "relative h-screen shrink-0 transition-[width] duration-300 ease-in-out sidebar",
        collapsed ? "w-[76px]" : "w-[300px]"
      )}
    >
      <AutoTitleAgent />
      <div className="sticky top-0 h-screen p-2 sm:p-3 flex flex-col">
        <div className="glass relative flex h-full flex-col overflow-hidden rounded-2xl">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-secondary)]">
            <button
              className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 focus-ring"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <PanelsTopLeft size={18} />
            </button>
            
            {!collapsed && (
              <Link href="/" className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-[var(--bg-overlay)] transition-colors">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent-blue)] to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  C
                </div>
                <span className="text-lg font-semibold tracking-tight">CareIQ</span>
              </Link>
            )}
            
            <ThemeToggle size="sm" className="w-10 h-10" />
          </div>

          {/* Search + New Chat */}
          <div className={cn("px-4 py-4 border-b border-[var(--border-secondary)]", collapsed && "px-2")}>
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search chats..."
                    className="input-liquid pl-10 text-sm h-10"
                  />
                </div>
                <button