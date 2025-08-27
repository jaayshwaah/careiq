/* 
   FILE: src/components/AppShell.tsx
   Replace entire file with this enhanced version
*/

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
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

      {/* Main content area with liquid glass background */}
      <main className="flex min-w-0 min-h-0 flex-1 overflow-hidden relative">
        {/* Subtle background pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, var(--text-primary) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}
        />
        
        {/* Content container */}
        <div className="relative z-10 mx-auto w-full max-w-4xl flex min-h-0 flex-1 flex-col px-6 pb-8 pt-6 animate-fadeUp overflow-y-auto scroll-area">
          {children}
        </div>
        
        {/* Gradient overlays for depth */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[var(--bg-primary)] to-transparent pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none z-20" />
      </main>
    </div>
  );
}