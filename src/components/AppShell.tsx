// src/components/AppShell.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/reset-password",
  "/update-password",
]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const onAuthRoute = [...AUTH_PATHS].some((p) => pathname.startsWith(p));

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");
    const handler = () => setCollapsed(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (onAuthRoute) {
    return (
      <div className="min-h-svh w-full">
        <main className="mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-svh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Leave the central column NOT scrollable; children manage their own scroll (MessageList). */}
      <main className="flex min-w-0 flex-1">
        <div className="mx-auto w-full max-w-3xl flex min-h-0 flex-1 flex-col px-4 pb-8 pt-4 sm:pt-6 lg:pt-8 animate-fadeUp">
          {children}
        </div>
      </main>
    </div>
  );
}
