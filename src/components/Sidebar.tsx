"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, PanelsTopLeft, Settings, User, LogOut } from "lucide-react";
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
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isCollapsed = collapsed;
  const width = isCollapsed ? "w-[84px]" : "w-[300px]";
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
        if (error) {
          setLoadError(error.message);
        } else {
          setLoadError(null);
          setChats(data || []);
        }
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err?.message || "Failed to load chats");
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

  async function handleNewChat() {
    const resp = await fetch("/api/chats", { method: "POST" });
    const created = await resp.json();
    router.push(`/chat/${created.id}`);
  }

  const activeId = pathname?.startsWith("/chat/") ? pathname.split("/").pop() : "";

  return (
    <aside className={cn("relative h-svh shrink-0 transition-[width] duration-300 ease-ios", width)}>
      <div className="sticky top-0 h-svh p-3">
        <div className="glass flex h-full flex-col overflow-hidden">
          {/* Header / Toggle */}
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

            <div className={cn("ml-auto", isCollapsed && "hidden")}>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="rounded-xl" onClick={onToggle} aria-label="Toggle sidebar">
                      <PanelsTopLeft className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Toggle sidebar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* When collapsed, show the toggle centered below logo */}
            {isCollapsed && (
              <div className="absolute left-0 right-0 -bottom-2 flex justify-center">
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={onToggle}
                  aria-label="Expand sidebar"
                >
                  <PanelsTopLeft className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* New chat */}
          <div className={cn("px-2", isCollapsed && "px-0")}>
            {isCollapsed ? (
              <div className="flex justify-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="default"
                        className="h-12 w-12 rounded-2xl shadow hover:shadow-md"
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
              <Button className="w-full rounded-2xl shadow hover:shadow-md transition-shadow justify-start" onClick={handleNewChat}>
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">New chat</span>
              </Button>
            )}
          </div>

          <Separator className="my-3" />

          {/* Chats list */}
          <div className="flex-1 px-1">
            <ScrollArea className="h-full pr-2">
              {loadError ? (
                <div className={cn("text-xs text-ink-subtle px-2 py-1", !isCollapsed && "text-left")}>
                  Unable to load chats.
                </div>
              ) : isCollapsed ? (
                /* Collapsed: show a clean icon stack (no shrinking) */
                <ul className="flex flex-col items-center gap-2">
                  {chats.slice(0, 12).map((c) => {
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
                                  isActive && "bg-black/5 dark:bg-white/5"
                                )}
                              >
                                {/* decorative square */}
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
                /* Expanded: full list with titles */
                <ul className="space-y-1">
                  {chats.map((c) => {
                    const isActive = c.id === activeId;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/chat/${c.id}`}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition",
                            isActive && "bg-black/5 dark:bg-white/5"
                          )}
                        >
                          <div className="h-6 w-6 rounded-lg bg-black/5 dark:bg-white/10" />
                          <span className="truncate">{c.title || "New chat"}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          <Separator className="my-3" />

          {/* Account bottom */}
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
                    <SheetContent className="w-[380px] sm:w-[480px]">
                      <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4 space-y-6">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Appearance</div>
                          <div className="text-xs text-ink-subtle">Uses your system light/dark theme.</div>
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Account</div>
                          <Button variant="secondary" className="w-full justify-start gap-2 rounded-xl">
                            Manage account (placeholder)
                          </Button>
                          <Button variant="ghost" className="w-full justify-start gap-2 rounded-xl text-red-600 hover:text-red-700">
                            <LogOut className="h-4 w-4" />
                            Log out
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
