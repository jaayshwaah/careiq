"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { useTheme } from "./ThemeProvider";

/** Simple inline icons (no extra deps) */
const IconLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0%" stopColor="#10A37F" />
        <stop offset="100%" stopColor="#4CD4B0" />
      </linearGradient>
    </defs>
    <rect x="3" y="5" width="18" height="14" rx="5" fill="url(#g)" />
    <path d="M8 12h8M8 9h6M8 15h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconChevron = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
const IconPlus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
);
const IconSun = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20.5 20.5L19 19M5 19l-1.5 1.5M20.5 3.5L19 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
);
const IconMoon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg>
);
const IconUser = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-8 2-8 6v1h16v-1c0-4-4-6-8-6Z" fill="currentColor"/></svg>
);

type Chat = {
  id: string;
  title: string;
};

type Props = {
  chats?: Chat[];       // pass in list (if logged-in)
  onNewChat?: () => void;
  collapsedByDefault?: boolean;
};

export default function Sidebar({ chats = [], onNewChat, collapsedByDefault = false }: Props) {
  const [collapsed, setCollapsed] = React.useState(collapsedByDefault);
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Cycle: light -> dark -> system -> light
    const order: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  };

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col border-r`}
      style={{
        borderColor: "var(--border)",
        width: collapsed ? 76 : 300,
        transition: "width .28s cubic-bezier(.2,.8,.2,1), background .3s",
        background: "linear-gradient(180deg, rgba(255,255,255,0.68), rgba(255,255,255,0.6))",
        backdropFilter: "saturate(180%) blur(14px)",
      }}
    >
      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-2"
           style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
        <Link href="/" className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--panel-2)] transition">
          <IconLogo className="w-7 h-7" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">CareIQ</span>
              <span className="text-[11px] text-[var(--text-dim)] -mt-0.5">Chat</span>
            </div>
          )}
        </Link>

        <button
          className="ml-auto btn-ghost rounded-xl p-2"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <IconChevron
            className={`w-5 h-5 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
        <button
          className="btn btn-primary w-full"
          onClick={onNewChat}
          title="Start a new chat"
        >
          <IconPlus className="w-4 h-4" />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2 py-3" style={{ background: "var(--bg)" }}>
        {chats.length === 0 ? (
          <div className="text-xs text-[var(--muted)] px-2 py-2">
            {!collapsed ? "No chats yet" : null}
          </div>
        ) : (
          <ul className="space-y-1">
            {chats.map((c) => {
              const active = pathname?.includes(c.id);
              return (
                <li key={c.id}>
                  <Link
                    href={`/chat/${c.id}`}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition
                      ${active ? "bg-[var(--panel)] border border-[var(--border)]" : "hover:bg-[var(--panel-2)]"}
                    `}
                  >
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: active ? "var(--accent)" : "var(--border)" }} />
                    {!collapsed && (
                      <span className="text-sm text-ellipsis whitespace-nowrap overflow-hidden max-w-[220px]">
                        {c.title}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
          {/* Account */}
          <Link
            href="/settings"
            className="btn btn-ghost px-2 py-2 rounded-xl"
            title="Open settings"
          >
            <IconUser className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Account</span>}
          </Link>

          {/* Theme toggle */}
          <button
            className="btn btn-ghost px-2 py-2 rounded-xl"
            onClick={toggleTheme}
            title={`Theme: ${theme} (${resolvedTheme})`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <IconMoon className="w-5 h-5" />
            ) : (
              <IconSun className="w-5 h-5" />
            )}
            {!collapsed && <span className="text-sm capitalize">{theme}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
