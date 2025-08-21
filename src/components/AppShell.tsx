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
  const [collapsed, setCollapsed] = useState(false);

  // Collapse sidebar on auth pages
  useEffect(() => {
    setCollapsed(AUTH_PATHS.has(pathname));
  }, [pathname]);

  return (
    <div className="flex h-svh">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Keep the central column as the sole scroll container */}
      <main className="flex min-w-0 min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto w-full max-w-3xl flex min-h-0 flex-1 flex-col px-4 pb-8 pt-4 sm:pt-6 lg:pt-8 animate-fadeUp overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
