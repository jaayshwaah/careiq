"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("careiq_sidebar_collapsed");
    if (saved) setCollapsed(saved === "1");
  }, []);
  useEffect(() => {
    localStorage.setItem("careiq_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex h-svh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="flex-1 overflow-hidden">
        <div className="h-3 w-full bg-gradient-to-b from-black/5 to-transparent dark:from-white/10" />
        <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:pt-6 lg:pt-8 animate-fadeUp">
          {children}
        </div>
      </main>
    </div>
  );
}
