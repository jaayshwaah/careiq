// src/components/AppShell.tsx - Updated to ensure proper rendering
"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't show sidebar on auth pages or admin pages (admin has its own layout)
  const isAuthPage = pathname?.startsWith("/login") || 
                     pathname?.startsWith("/register") || 
                     pathname?.startsWith("/(auth)");
  const isAdminPage = pathname?.startsWith("/admin");
  const showSidebar = mounted && !isAuthPage && !isAdminPage;

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
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

  // Auth pages don't need sidebar
  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {showSidebar && (
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
      )}
      
      <main className={`flex-1 flex flex-col min-w-0 ${showSidebar ? '' : 'w-full'}`}>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}