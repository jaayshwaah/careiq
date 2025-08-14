"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, PanelsTopLeft, Settings, User, LogOut, Search as SearchIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ChatRow = { id: string; title: string | null; created_at: string };

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chats, setChats] = useState<ChatRow[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  const isCollapsed = collapsed;
  const width = isCollapsed ? "w-[76px]" : "w-[300px]";
  const showLabels = !isCollapsed;

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
        ?.on("postgres_changes", { event: "*", schema: "public", table: "chats" }, load)
        ?.subscribe();
      unsub = channel ? () => supabase.removeChannel(channel) : null;
    } catch {}
    return () => {
      mounted = false;
      try { unsub?.(); } catch {}
    };
  }, []);

  // Cmd/Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = /Mac|iPhone|iPad|Macintosh/.test(navigator.platform || "");
      if ((isMac && e.metaKey && e.key.toLowerCase() === "k") || (!isMac && e.ctrlKey && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleNewChat() {
    const resp = await fetch("/api/chats", { method: "POST" });
    const created = await resp.json();
    router.push(`/chat/${created.id}`);
  }

  const activeId =
    pathname?.startsWith("/chat/") && pathname.split("/").filter(Boolean)[1] !== "chat"
      ? pathname.split("/").pop()
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter((c) => (c.title || "New chat").toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [query, chats]);

  return (
    <aside className={cn("relative h-svh shrink-0 transition-[width] duration-300 ease-ios", width)}>
      <div className="sticky top-0 h-svh p-2 sm:p-3">
        <div className="glass ring-1 ring-black/10 dark:ring-white/10 flex h-full flex-col overflow-hidden rounded-2xl">
          {/* Top bar: logo + collapse */}
          <div className={cn("flex items-center gap-2 p-2", isCollapsed ? "justify-center" : "")}>
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
              {showLabels && <span className="text-sm font-semibold">CareIQ</span>}
            </Link>

            <div className={cn("ml-auto flex items-center gap-1", isCollapsed && "hidden")}>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl ring-1 ring-black/10 dark:ring-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                      onClick={() => setSearchOpen(true)}
                      aria-label="Search chats"
                    >
                      <SearchIcon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Search (⌘K)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl ring-1 ring-black/10 dark:ring-white/10 hover:bg-black/10 dark:hover:bg-white/15"
                      onClick={onToggle}
                      aria-label="Collapse sidebar"
                    >
                      <PanelsTopLeft className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Collapse</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* New Chat (icon when collapsed, label when expanded) */}
          <div className={cn("px-2", isCollapsed && "px-0")}>
            {isCollapsed ? (
              <div className="flex justify-center pb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="default"
                        className="h-12 w-12 rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md"
                        onClick={handleNewChat}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">New chat</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : (
              <Button
                className="w-full rounded-2xl ring-1 ring-black/10 dark:ring-white/10 bg-white/70 hover:bg-white/90 active:bg-white dark:bg-white/10 dark:hover:bg-white/15 shadow-soft hover:shadow-md transition-shadow justify-start gap-2"
                onClick={handleNewChat}
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">New chat</span>
              </Button>
            )}
          </div>

          <Separator className="my-3" />

          {/* Chats list */}
          <div className="flex-1 overflow-hidden">
            <div className={cn("h-full", isCollapsed ? "" : "px-2")}>
              <ScrollArea className="h-[calc(100%-1px)]">
                {isCollapsed ? (
                  <ul className="flex flex-col items-center gap-2 pb-4">
                    {chats.map((c) => {
                      const isActive = c.id === activeId;
                      return (
                        <li key={c.id}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/chat/${c.id}`}
                                  className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition",
                                    isActive && "bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
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
                  <ul className="space-y-1 pb-4">
                    {chats.map((c) => {
                      const isActive = c.id === activeId;
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/chat/${c.id}`}
                            className={cn(
                              "group flex items-center gap-2 rounded-2xl px-2 py-2 transition hover:bg-black/5 dark:hover:bg-white/5 ring-1 ring-transparent hover:ring-black/10 dark:hover:ring-white/10",
                              isActive && "bg-black/5 dark:bg-white/5 ring-1 ring-black/10 dark:ring-white/10"
                            )}
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                              <span className="h-3 w-3 rounded-[4px] bg-black/30 dark:bg-white/30" />
                            </div>
                            <div className="flex-1 truncate text-sm">{c.title || "New chat"}</div>
                          </Link>
                        </li>
                      );
                    })}
                    {chats.length === 0 && (
                      <li className="px-2 py-2 text-xs text-ink-subtle">No chats yet</li>
                    )}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Bottom account */}
          <div className="px-2 pb-2">
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-2")}>
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
                      <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Settings">
                        <Settings className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[380px] sm:w-[480px] glass ring-1 ring-black/10 dark:ring-white/10">
                      <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 space-y-6">
                        {/* Placeholder settings */}
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search palette */}
      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent className="glass ring-1 ring-black/10 dark:ring-white/10 w-full sm:max-w-lg rounded-2xl">
          <SheetHeader>
            <SheetTitle>Search chats</SheetTitle>
          </SheetHeader>
          <div className="mt-3">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-xl border-none ring-1 ring-black/10 dark:ring-white/10 bg-white/70 dark:bg-white/10 px-3 py-2 outline-none"
            />
            <div className="mt-3 max-h-[50vh] overflow-y-auto space-y-1">
              {filtered.map((c) => (
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
                <div className="rounded-xl px-3 py-2 text-xs text-ink-subtle">No results</div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </aside>
  );
}
