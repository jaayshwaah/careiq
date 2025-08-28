// src/components/AppShell.tsx - Simplified for ChatGPT-style layout
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show loading on auth pages or admin pages
  const isAuthPage = pathname?.startsWith("/login") || 
                     pathname?.startsWith("/register") || 
                     pathname?.startsWith("/(auth)");
  const isAdminPage = pathname?.startsWith("/admin");

  if (!mounted && !isAuthPage) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading CareIQ...</p>
        </div>
      </div>
    );
  }

  // Admin pages use their own layout
  if (isAdminPage) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</div>;
  }

  // Auth pages don't need app shell
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    );
  }

  // Main app - let pages handle their own layout (ChatGPT style)
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {children}
    </div>
  );
}
