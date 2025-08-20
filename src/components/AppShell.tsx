// src/components/AppShell.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

const AUTH_PATHS = new Set(["/login", "/register", "/reset-password", "/update-password"]);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const onAuthRoute = [...AUTH_PATHS].some((p) => pathname.startsWith(p));

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("careiq_sidebar_collapsed");
      if (saved) setCollapsed(saved === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("careiq_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  if (onAuthRoute) {
    // Minimal page chrome on auth routes
    return (
      <div className="min-h-svh">
        <main className="mx-auto w-full max-w-md px-5 py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-svh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-3xl flex-1 overflow-hidden px-4 pb-8 pt-4 sm:pt-6 lg:pt-8 animate-fadeUp">
          {children}
        </div>
      </main>
    </div>
  );
}
