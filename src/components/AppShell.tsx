"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <div className="mx-auto w-full max-w-3xl flex-1 overflow-hidden px-4 pb-8 pt-4 sm:pt-6 lg:pt-8 animate-fadeUp">
          {children}
        </div>
      </main>
    </div>
  );
}
