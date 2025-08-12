"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { useTheme } from "./ThemeProvider";

/** Icons (inline SVGs) */
const IconLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0%" stopColor="#10A37F" />
        <stop offset="100%" stopColor="#4CD4B0" />
      </linearGradient>
    </defs>
    <rect x="3" y="5" width="18" height="14" rx="5" fill="url(#g)" />
    <path d="M8 12h8M8 9h6M8 15h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconChevron = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconPlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" fill="none"/>
    <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const IconSun = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" fill="none"/>
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

const IconMoon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" fill="none"/>
  </svg>
);

const IconUser = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z" fill="currentColor"/>
  </svg>
);

type Chat = {
  id: string;
  title: string;
  /** Optional timestamps for recency sorting, if your data has them */
  updatedAt?: string;       // ISO string
  lastMessageAt?: string;   // ISO string
};

type User = { name?: string; avatarUrl?: string; };

type Props = {
  chats?: Chat[];
  collapsedByDefault?: boolean;
  user?: User;
};

/** Helpers: pick most-recent N chats if timestamps exist */
const RECENT_COUNT = 6;
function parseTime(c: Chat): number {
  const s = c.updatedAt ?? c.lastMessageAt ?? "";
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
}
function getRecentChats(chats: Chat[], n = RECENT_COUNT): Chat[] {
  const copy = [...chats];
  // Sort desc by available timestamp; if none, keep original order
  copy.sort((a, b) => {
    const ta = parseTime(a), tb = parseTime(b);
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
  return copy.slice(0, n);
}

export default function Sidebar({ chats = [], collapsedByDefault, user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return collapsedByDefault ?? false;
    const isHome = window.location.pathname === "/";
    return collapsedByDefault ?? isHome; // default collapse on home
  });

  // Expanded inline search
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Modal search (for collapsed rail)
  const [showSearchModal, setShowSearchModal] = React.useState(false);
  const [searchModalTerm, setSearchModalTerm] = React.useState("");

  React.useEffect(() => {
    if (collapsedByDefault !== undefined) return;
    setCollapsed(pathname === "/");
    setShowSearch(false);
    setSearchTerm("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Clicking anywhere on a collapsed sidebar expands it (except on action buttons)
  const handleSidebarClick = () => {
    if (collapsed) setCollapsed(false);
  };

  const toggleTheme = () => {
    const order: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  };

  // Actions
  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data?.id) {
          router.push(`/chat/${data.id}`);
          return;
        }
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
      router.push("/");
      router.refresh();
    }
  };

  const openSearchModal = () => {
    setShowSearchModal(true);
    setSearchModalTerm("");
  };

  // Filtering
  const filteredChatsExpanded =
    searchTerm.trim().length === 0
      ? chats
      : chats.filter((c) => c.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredChatsModal =
    searchModalTerm.trim().length === 0
      ? chats
      : chats.filter((c) => c.title.toLowerCase().includes(searchModalTerm.toLowerCase()));

  // “Recent” list for modal when query is empty
  const recentChats = React.useMemo(() => getRecentChats(chats, RECENT_COUNT), [chats]);

  // Avatar initials
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "U";

  // Focus modal input
  const modalInputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    if (showSearchModal) {
      const t = setTimeout(() => modalInputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [showSearchModal]);

  // ESC closes modal
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSearchModal(false);
    };
    if (showSearchModal) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSearchModal]);

  return (
    <>
      <aside
        className="h-screen sticky top-0 flex flex-col border-r"
        style={{
          borderColor: "var(--border)",
          width: collapsed ? 60 : 300, // slimmer when collapsed
          transition: "width .28s cubic-bezier(.2,.8,.2,1), background .3s",
          background: "linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.6))",
          backdropFilter: "saturate(180%) blur(14px)",
          userSelect: "none",
        }}
        onClick={handleSidebarClick}
      >
        {collapsed ? (
          // Collapsed rail (icon-only)
          <div className="flex h-full flex-col items-center justify-between py-3">
            {/* Top icons */}
            <div className="flex flex-col items-center gap-3">
              {/* Home */}
              <Link
                href="/"
                className="rounded-xl p-2 hover:bg-[var(--panel-2)] transition"
                title="Home"
                aria-label="Home"
                onClick={(e) => e.stopPropagation()}
              >
                <IconLogo className="w-6 h-6" />
              </Link>

              {/* New Chat */}
              <button
                className="rounded-xl p-2 hover:bg-[var(--panel-2)] transition"
                title="New Chat"
                aria-label="New Chat"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleNewChat();
                }}
              >
                <IconPlus className="w-5 h-5" />
              </button>

              {/* Search -> modal */}
              <button
                className="rounded-xl p-2 hover:bg-[var(--panel-2)] transition"
                title="Search chats"
                aria-label="Search chats"
                onClick={(e) => {
                  e.stopPropagation();
                  openSearchModal();
                }}
              >
                <IconSearch className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom: user avatar -> settings */}
            <Link
              href="/settings"
              className="rounded-full overflow-hidden"
              title="Account"
              aria-label="Account"
              onClick={(e) => e.stopPropagation()}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.name || "User"}
                  className="w-8 h-8 rounded-full object-cover border"
                  style={{ borderColor: "var(--border)" }}
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full grid place-items-center text-xs font-semibold"
                  style={{
                    background: "var(--panel)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {initials}
                </div>
              )}
            </Link>
          </div>
        ) : (
          // Expanded sidebar
          <>
            {/* Header */}
            <div
              className="px-3 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                href="/"
                className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--panel-2)] transition"
              >
                <IconLogo className="w-7 h-7" />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight">CareIQ</span>
                  <span className="text-[11px] text-[var(--text-dim)] -mt-0.5">Chat</span>
                </div>
              </Link>

              <button
                className="ml-auto btn-ghost rounded-xl p-2"
                aria-label="Collapse sidebar"
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed(true);
                }}
                title="Collapse"
              >
                <IconChevron className="w-5 h-5 rotate-180 transition-transform" />
              </button>
            </div>

            {/* New Chat + Search row */}
            <div
              className="p-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="btn btn-primary flex-1" onClick={handleNewChat} title="Start a new chat">
                <IconPlus className="w-4 h-4" />
                <span>New Chat</span>
              </button>

              <button
                className="btn btn-ghost rounded-xl px-3"
                title="Search chats"
                onClick={() => setShowSearch((v) => !v)}
              >
                <IconSearch className="w-5 h-5" />
                <span className="sr-only">Search</span>
              </button>
            </div>

            {/* Search input (expanded only) */}
            {showSearch && (
              <div className="p-3" onClick={(e) => e.stopPropagation()}>
                <input
                  className="input"
                  placeholder="Search chats…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {/* Chat list */}
            <div
              className="flex-1 overflow-y-auto px-2 py-3"
              style={{ background: "var(--bg)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {filteredChatsExpanded.length === 0 ? (
                <div className="text-xs text-[var(--muted)] px-2 py-2">No chats yet</div>
              ) : (
                <ul className="space-y-1">
                  {filteredChatsExpanded.map((c) => {
                    const active = pathname?.includes(c.id);
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/chat/${c.id}`}
                          className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition
                            ${active ? "bg-[var(--panel)] border border-[var(--border)]" : "hover:bg-[var(--panel-2)]"}
                          `}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ background: active ? "var(--accent)" : "var(--border)" }}
                          />
                          <span className="text-sm text-ellipsis whitespace-nowrap overflow-hidden max-w-[220px]">
                            {c.title}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer: account + theme controls */}
            <div
              className="px-3 py-3"
              style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2">
                <Link href="/settings" className="btn btn-ghost px-2 py-2 rounded-xl" title="Open settings">
                  <IconUser className="w-5 h-5" />
                  <span className="text-sm">Account</span>
                </Link>

                <button
                  className="btn btn-ghost px-2 py-2 rounded-xl"
                  onClick={toggleTheme}
                  title={`Theme: ${theme} (${resolvedTheme})`}
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <IconMoon className="w-5 h-5" /> : <IconSun className="w-5 h-5" />}
                  <span className="text-sm capitalize">{theme}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Centered Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "saturate(180%) blur(4px)" }}
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="absolute left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-soft"
            style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search chats"
          >
            <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
              <input
                ref={modalInputRef}
                className="input"
                placeholder="Search your chats…"
                value={searchModalTerm}
                onChange={(e) => setSearchModalTerm(e.target.value)}
              />
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {/* Section label */}
              <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                {searchModalTerm.trim().length ? "Results" : "Recent chats"}
              </div>

              <div className="p-2">
                {(() => {
                  const list = searchModalTerm.trim().length ? filteredChatsModal : recentChats;
                  if (list.length === 0) {
                    return (
                      <div className="text-xs px-2 py-3" style={{ color: "var(--muted)" }}>
                        {searchModalTerm.trim().length ? "No matching chats." : "No chats yet."}
                      </div>
                    );
                  }
                  return (
                    <ul className="space-y-1">
                      {list.map((c) => (
                        <li key={c.id}>
                          <button
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--panel-2)] transition"
                            onClick={() => {
                              setShowSearchModal(false);
                              router.push(`/chat/${c.id}`);
                            }}
                          >
                            <div className="text-sm" style={{ color: "var(--text)" }}>{c.title}</div>
                            <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                              {c.id}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>

            <div className="p-2 flex justify-end gap-2 border-t" style={{ borderColor: "var(--border)" }}>
              <button className="btn btn-ghost px-3 py-1.5" onClick={() => setShowSearchModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
