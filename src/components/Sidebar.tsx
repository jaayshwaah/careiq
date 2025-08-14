"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  PanelsTopLeft,
  Settings,
  User,
  Search as SearchIcon,
  ChevronRight,
  LogOut,
  Pin,
  MoreHorizontal,
  PinOff,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader as DialogHeaderBase,
  DialogTitle as DialogTitleBase,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ChatRow = { id: string; title: string | null; created_at: string };

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const PIN_STORAGE_KEY = "careiq.pinnedChatIds.v1";

function loadPinnedIds(): string[] {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePinnedIds(ids: string[]) {
  try {
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isMac, setIsMac] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isCollapsed = collapsed;
  const width = isCollapsed ? "w-[76px]" : "w-[300px]";
  const showLabels = !isCollapsed;
  const shortcutSearch = isMac ? "⌘K" : "Ctrl+K";
  const shortcutNewChat = isMac ? "⌘N" : "Ctrl+N";

  // gradient palette for "New chat" chip-style button (randomized on mount)
  const newChatPalette = useMemo<[string, string]>(() => {
    const seeds: [string, string][] = [
      ["#8bb0ff", "#a0e3ff"],
      ["#b8f3d4", "#8fd8ff"],
      ["#ffd6a5", "#cdb4ff"],
      ["#ffcad4", "#cce6ff"],
      ["#c1ffd7", "#ffd1f7"],
    ];
    return seeds[Math.floor(Math.random() * seeds.length)];
  }, []);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|Macintosh/.test(navigator.platform || ""));
  }, []);

  useEffect(() => {
    // Load pinned on mount (client-side)
    try {
      setPinnedIds(loadPinnedIds());
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("chats")
          .select("*")
          .order("created_at", { ascending: false });
        if (!mounted) return;
        if (!error) setChats(data || []);
      } catch {
        if (!mounted) return;
        setChats([]);
      }
    }

    load();

    // Realtime best-effort
    let unsub: (() => void) | null = null;
    try {
      const channel = (supabase as any)
        .channel?.("realtime:chats")
        ?.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chats" },
          load
        )
        ?.subscribe();
      unsub = channel ? () => supabase.removeChannel(channel) : null;
    } catch {}
    return () => {
      mounted = false;
      try {
        unsub?.();
      } catch {}
    };
  }, []);

  // Global hotkeys:
  //  - ⌘/Ctrl+K => open Search (focus input)
  //  - ⌘/Ctrl+N => New Chat
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMacLocal = /Mac|iPhone|iPad|Macintosh/.test(
        navigator.platform || ""
      );
      const key = e.key.toLowerCase();

      const metaPressed = isMacLocal ? e.metaKey : e.ctrlKey;

      if (metaPressed && key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        // Focus input after dialog opens
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
        return;
      }

      if (metaPressed && key === "n") {
        e.preventDefault();
        handleNewChat();
        return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleNewChat() {
    const resp = await fetch("/api/chats", { method: "POST" });
    const created = await resp.json();
    router.push(`/chat/${created.id}`);
  }

  function isPinned(id: string) {
    return pinnedIds.includes(id);
  }

  function togglePin(id: string) {
    setPinnedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [id, ...prev];
      savePinnedIds(next);
      return next;
    });
  }

  const activeId =
    pathname?.startsWith("/chat/") &&
    pathname.split("/").filter(Boolean)[1] !== "chat"
      ? pathname.split("/").pop()
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        (c.title || "New chat").toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [query, chats]);

  // Derived lists: pinned & recent (preserve original recency within each group)
  const { pinnedList, recentList } = useMemo(() => {
    const pinned: ChatRow[] = [];
    const recent: ChatRow[] = [];
    for (const c of chats) {
      if (pinnedIds.includes(c.id)) pinned.push(c);
      else recent.push(c);
    }
    // Optional: order pinned by the order in pinnedIds
    const pinnedOrderIndex = new Map<string, number>();
    pinnedIds.forEach((id, idx) => pinnedOrderIndex.set(id, idx));
    pinned.sort(
      (a, b) =>
        (pinnedOrderIndex.get(a.id) ?? 0) - (pinnedOrderIndex.get(b.id) ?? 0)
    );
    return { pinnedList: pinned, recentList: recent };
  }, [chats, pinnedIds]);

  // Expand-on-background-click when collapsed (ignore clicks on interactive controls)
  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isCollapsed) return;
    const target = e.target as HTMLElement;
    const interactive = !!target.closest(
      'a,button,input,textarea,select,[role="button"],[data-no-expand]'
    );
    if (!interactive) onToggle();
  }

  return (
    <aside
      className={cn(
        "relative h-svh shrink-0 transition-[width] duration-300 ease-ios",
        width
      )}
    >
      <div className="sticky top-0 h-svh p-2 sm:p-3">
        <div
          className="glass ring-1 ring-black/10 dark:ring-white/10 relative flex h-full flex-col overflow-hidden rounded-2xl"
          onClick={handleContainerClick}
        >
          {/* Click-to-expand chevron when collapsed */}
          {isCollapsed && (
            <button
              type="button"
              data-no-expand
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft backdrop-blur-sm"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="mx-auto h-4 w-4" />
            </button>
          )}

          {/* Top bar: logo + collapse */}
          <div
            className={cn(
              "flex items-center gap-2 p-2",
              isCollapsed ? "justify-center" : ""
            )}
          >
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-black/5 dark:hover:bg-white/5",
                isCollapsed ? "justify-center" : ""
              )}
            >
              <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-insetglass">
                <Image src="/logo.svg" alt="CareIQ" fill sizes="36px" priority />
              </div>
              {showLabels && (
                <span className="text-sm font-semibold">CareIQ</span>
              )}
            </Link>

            {!isCollapsed && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl ring-1 ring-black/10 dark:ring-white/10 hover:bg-black/10 dark:hover:bg-white/15 ml-auto"
                      onClick={onToggle}
                      aria-label="Collapse sidebar"
                    >
                      <PanelsTopLeft className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Collapse</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* New Chat (with shortcut hint; soft glass style) */}
          <div className={cn("px-2", isCollapsed && "px-0")}>
            {isCollapsed ? (
              <div
                className="relative group flex justify-center pb-2"
                data-no-expand
              >
                <span
                  className="pointer-events-none absolute inset-x-1 -z-10 top-0 bottom-0 rounded-2xl opacity-90 animate-blob"
                  style={{
                    background: `linear-gradient(120deg, ${newChatPalette[0]}, ${newChatPalette[1]})`,
                    filter: "blur(14px)",
                  }}
                  aria-hidden
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleNewChat}
                        className="relative z-[1] h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/60 hover:bg-white/80 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft transition"
                        aria-label={`New chat (${shortcutNewChat})`}
                        title={`New chat (${shortcutNewChat})`}
                      >
                        <Plus className="mx-auto h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      New chat ({shortcutNewChat})
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <div className="relative group" data-no-expand>
                <span
                  className="pointer-events-none absolute inset-0 -z-10 rounded-2xl opacity-90 animate-blob"
                  style={{
                    background: `linear-gradient(120deg, ${newChatPalette[0]}, ${newChatPalette[1]})`,
                    filter: "blur(14px)",
                  }}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="relative z-[1] overflow-hidden w-full rounded-2xl bg-white/60 px-3 py-2 text-left transition hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/15 ring-1 ring-black/10 dark:ring-white/10 shadow-soft"
                  aria-label={`New chat (${shortcutNewChat})`}
                  title={`New chat (${shortcutNewChat})`}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm font-medium">New chat</span>
                    <span className="ml-auto text-xs text-ink-subtle">
                      ({shortcutNewChat})
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Search Button (styled to match New Chat) */}
          <div className={cn("px-2 mt-2", isCollapsed && "px-0")}>
            {isCollapsed ? (
              <div className="relative group flex justify-center" data-no-expand>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(true);
                    setTimeout(() => searchInputRef.current?.focus(), 0);
                  }}
                  className="relative z-[1] h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/60 hover:bg-white/80 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft transition"
                  aria-label={`Search (${shortcutSearch})`}
                  title={`Search (${shortcutSearch})`}
                >
                  <SearchIcon className="mx-auto h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }}
                className="relative z-[1] overflow-hidden w-full rounded-2xl bg-white/60 px-3 py-2 text-left transition hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/15 ring-1 ring-black/10 dark:ring-white/10 shadow-soft"
                aria-label={`Search (${shortcutSearch})`}
                title={`Search (${shortcutSearch})`}
              >
                <div className="flex items-center gap-2">
                  <SearchIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Search</span>
                  <span className="ml-auto text-xs text-ink-subtle">
                    ({shortcutSearch})
                  </span>
                </div>
              </button>
            )}
          </div>

          <Separator className="my-3" />

          {/* Chats list with Pinned / Recent sections */}
          <div className="flex-1 overflow-hidden">
            <div className={cn("h-full", isCollapsed ? "" : "px-2")}>
              <ScrollArea className="h-[calc(100%-1px)] pr-1">
                {/* Collapsed: keep simple icon list */}
                {isCollapsed ? (
                  <ul className="flex flex-col items-center gap-2 pb-4">
                    {pinnedList.map((c) => {
                      const isActive = c.id === activeId;
                      return (
                        <li key={`p-${c.id}`}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/chat/${c.id}`}
                                  className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition",
                                    isActive &&
                                      "bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                                  )}
                                >
                                  <div className="h-5 w-5 rounded-md bg-black/20 dark:bg-white/20" />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px]">
                                📌 {c.title || "New chat"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </li>
                      );
                    })}
                    {recentList.map((c) => {
                      const isActive = c.id === activeId;
                      return (
                        <li key={`r-${c.id}`}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/chat/${c.id}`}
                                  className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition",
                                    isActive &&
                                      "bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                                  )}
                                >
                                  <div className="h-5 w-5 rounded-md bg-black/20 dark:bg-white/20" />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[220px]">
                                {c.title || "New chat"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="pb-4 space-y-3">
                    {/* Pinned section */}
                    {pinnedList.length > 0 && (
                      <section>
                        <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                          Pinned
                        </div>
                        <ul className="space-y-1">
                          {pinnedList.map((c) => {
                            const isActive = c.id === activeId;
                            const pinned = isPinned(c.id);
                            return (
                              <li key={c.id}>
                                <div
                                  className={cn(
                                    "group flex items-center gap-2 rounded-2xl px-2 py-2 transition hover:bg-black/5 dark:hover:bg-white/5 ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10",
                                    isActive &&
                                      "bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                                  )}
                                >
                                  <Link
                                    href={`/chat/${c.id}`}
                                    className="min-w-0 flex flex-1 items-center gap-2"
                                  >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                                      <span className="h-3 w-3 rounded-[4px] bg-black/30 dark:bg-white/30" />
                                    </div>
                                    <div className="truncate text-sm">
                                      {c.title || "New chat"}
                                    </div>
                                  </Link>

                                  {/* Row actions: Pin / Overflow */}
                                  <div className="ml-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                                            aria-label={pinned ? "Unpin chat" : "Pin chat"}
                                            onClick={() => togglePin(c.id)}
                                          >
                                            {pinned ? (
                                              <Pin className="h-4 w-4 fill-current" />
                                            ) : (
                                              <Pin className="h-4 w-4" />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          {pinned ? "Unpin" : "Pin"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                                          aria-label="More actions"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuLabel>Chat actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem disabled>
                                          Rename (coming soon)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled>
                                          Duplicate (coming soon)
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          disabled
                                        >
                                          Delete (coming soon)
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    )}

                    {/* Recent section */}
                    <section>
                      <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">
                        Recent
                      </div>
                      <ul className="space-y-1">
                        {recentList.map((c) => {
                          const isActive = c.id === activeId;
                          const pinned = isPinned(c.id);
                          return (
                            <li key={c.id}>
                              <div
                                className={cn(
                                  "group flex items-center gap-2 rounded-2xl px-2 py-2 transition hover:bg-black/5 dark:hover:bg-white/5 ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10",
                                  isActive &&
                                    "bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                                )}
                              >
                                <Link
                                  href={`/chat/${c.id}`}
                                  className="min-w-0 flex flex-1 items-center gap-2"
                                >
                                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                                    <span className="h-3 w-3 rounded-[4px] bg-black/30 dark:bg-white/30" />
                                  </div>
                                  <div className="truncate text-sm">
                                    {c.title || "New chat"}
                                  </div>
                                </Link>

                                {/* Row actions: Pin / Overflow */}
                                <div className="ml-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                                          aria-label={pinned ? "Unpin chat" : "Pin chat"}
                                          onClick={() => togglePin(c.id)}
                                        >
                                          {pinned ? (
                                            <Pin className="h-4 w-4 fill-current" />
                                          ) : (
                                            <Pin className="h-4 w-4" />
                                          )}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        {pinned ? "Unpin" : "Pin"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
                                        aria-label="More actions"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40">
                                      <DropdownMenuLabel>Chat actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem disabled>
                                        Rename (coming soon)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem disabled>
                                        Duplicate (coming soon)
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        disabled
                                      >
                                        Delete (coming soon)
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                        {recentList.length === 0 && pinnedList.length === 0 && (
                          <li className="px-2 py-2 text-xs text-ink-subtle">
                            No chats yet
                          </li>
                        )}
                      </ul>
                    </section>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Bottom account */}
          <div className="px-2 pb-2">
            <div
              className={cn(
                "flex items-center",
                isCollapsed ? "justify-center" : "gap-2"
              )}
            >
              {isCollapsed ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/10">
                    <User className="h-5 w-5" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">You</div>
                    <div className="text-xs text-ink-subtle">Free plan</div>
                  </div>

                  <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl"
                        aria-label="Settings"
                      >
                        <Settings className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[380px] sm:w-[480px] glass ring-1 ring-black/10 dark:ring-white/10">
                      <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 space-y-6">
                        {/* Placeholder settings */}
                        <Button
                          variant="secondary"
                          className="w-full justify-start gap-2 rounded-xl"
                        >
                          Manage account (placeholder)
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 rounded-xl text-red-600 hover:text-red-700"
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search modal (centered window) */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="glass ring-1 ring-black/10 dark:ring-white/10 rounded-2xl sm:max-w-lg">
          <DialogHeaderBase>
            <DialogTitleBase>Search chats</DialogTitleBase>
          </DialogHeaderBase>
          <div className="mt-1">
            <input
              ref={searchInputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search chats… (${shortcutSearch})`}
              className="w-full rounded-xl border-none ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-white/10 px-3 py-2 outline-none"
            />
            <div className="mt-3 max-h-[50vh] overflow-y-auto space-y-1">
              {filtered
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/chat/${c.id}`}
                    onClick={() => setSearchOpen(false)}
                    className="block rounded-xl px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 transition"
                  >
                    <div className="text-sm">{c.title || "New chat"}</div>
                    <div className="text-[11px] text-ink-subtle">{c.id}</div>
                  </Link>
                ))}
              {filtered.length === 0 && (
                <div className="rounded-xl px-3 py-2 text-xs text-ink-subtle">
                  No results
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
