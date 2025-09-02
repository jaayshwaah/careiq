// src/app/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Shield, 
  Database, 
  Search, 
  Bug, 
  BarChart3, 
  Users, 
  FileText,
  Settings,
  Home,
  AlertTriangle,
  UserPlus
} from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/onboarding", label: "Client Onboarding", icon: UserPlus },
  { href: "/admin/knowledge", label: "Knowledge Base", icon: Database },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/search", label: "Search Debug", icon: Search },
  { href: "/admin/logs", label: "Error Logs", icon: Bug },
  { href: "/admin/health", label: "System Health", icon: AlertTriangle },
  { href: "/admin/settings", label: "Admin Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const router = useRouter();
  const supabase = getBrowserSupabase();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user) {
        router.push("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      // Check if user has admin privileges
      // Method 1: Check user metadata
      const isAdmin = session.user.user_metadata?.role === "admin" || 
                     session.user.user_metadata?.is_admin === true;

      // Method 2: Check against admin email list (hardcoded for security)
      const adminEmails = [
        process.env.NEXT_PUBLIC_ADMIN_EMAIL,
        "admin@careiq.app", // Add your admin emails here
        "jking@pioneervalleyhealth.com", // Authorized admin user
        // Add more admin emails as needed
      ].filter(Boolean);

      const isAdminByEmail = adminEmails.includes(session.user.email) || 
                            session.user.email?.endsWith('@careiq.com');

      // Method 3: Check profiles table for admin role
      let isAdminByProfile = false;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_admin")
          .eq("user_id", session.user.id)
          .single();
        
        isAdminByProfile = profile?.role === "admin" || 
                          profile?.role === "careiq_admin" || 
                          profile?.role?.includes("administrator") ||
                          profile?.is_admin === true;
      } catch (error) {
        console.warn("Could not check profile for admin status:", error);
        // If profile check fails but user is in admin email list, still allow access
        isAdminByProfile = isAdminByEmail;
      }

      const hasAdminAccess = isAdmin || isAdminByEmail || isAdminByProfile;

      if (!hasAdminAccess) {
        alert("Access denied. Admin privileges required.");
        router.push("/");
        return;
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Admin access check failed:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Admin Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex-shrink-0 p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">CareIQ Admin</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{userEmail}</p>
        </div>
        
        <nav className="flex-1 p-4 scrollable">
          <div className="mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Home className="h-4 w-4" />
              Back to App
            </Link>
          </div>
          
          <div className="space-y-1">
            {adminNavItems.map((item) => (
              <AdminNavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>

        <div className="flex-shrink-0 p-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-400">Admin Mode</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              You have administrative privileges. Use with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 scrollable bg-white dark:bg-gray-900">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminNavItem({ 
  href, 
  label, 
  icon: Icon 
}: { 
  href: string; 
  label: string; 
  icon: any 
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}