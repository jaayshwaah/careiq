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

  const width = collapsed ? "w-[76px]" : "w-[280px]";
  const labelCls = collapsed ? "opacity-0 pointer-events-none" : "opacity-100";
  const newBtnCls = collapsed ? "justify-center" : "justify-start";

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data, error } = await supabase.from("chats").select("*").order("created_at", { ascending: false });
        if (!mounted) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setLoadError(null);
        setChats(data || []);
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err?.message || "Failed to load chats");
        // Don’t throw — we keep the sidebar rendered.
      }
    }

    load();

    // Realtime channel is best-effort; if supabase init throws, we skip it
    let unsub: (() => void) | null = null;
    try {
      const channel = (supabase as any)
        .channel?.("realtime:chats")
        ?.on("postgres_changes", { event: "*", schema: "public", table: "chats" }, load)
        ?.subscribe();
      unsub = channel ? () => supabase.removeChannel(channel) : null;
    } catch {
      // ignore realtime errors
    }

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
          {/* Header */}
          <div className="flex items-center gap-2 p-2">
            <Link href="/" className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition">
              <div className="relative h-7 w-7 overflow-hidden rounded-xl shadow-insetglass">
                <Image src="/logo.svg" alt="CareIQ" fill sizes="28px" priority />
              </div>
              <span className={cn("text-sm font-semibold", labelCls)}>CareIQ</span>
            </Link>

            <div className="ml-auto flex items-center gap-1">
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
          </div>

          {/* New chat */}
          <div className="px-2">
            <Button className={cn("w-full rounded-2xl shadow hover:shadow-md transition-shadow", newBtnCls)} onClick={handleNewChat}>
              <Plus className="h-4 w-4" />
              <span className={cn("text-sm font-medium", labelCls)}>New chat</span>
            </Button>
          </div>

          <Separator className="my-3" />

          {/* Chats list */}
          <div className="flex-1 px-1">
            <ScrollArea className="h-full pr-2">
              {loadError ? (
                <div className={cn("text-xs text-ink-subtle px-2 py-1", !collapsed && "text-left")}>
                  Unable to load chats.
                </div>
              ) : (
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
                          <span className={cn("truncate", labelCls)}>{c.title || "New chat"}</span>
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
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/5 dark:bg-white/10">
                <User className="h-5 w-5" />
              </div>
              <div className={cn("flex-1", labelCls)}>
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
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
