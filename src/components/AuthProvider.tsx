/* 
   FILE: src/components/AuthProvider.tsx
   Safe auth implementation for testing
*/

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const supabase = getBrowserSupabase();

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.warn("Auth session error:", error.message);
          setIsAuthenticated(false);
          setUser(null);
        } else {
          setIsAuthenticated(!!session);
          setUser(session?.user || null);
        }
      } catch (error) {
        console.warn("Auth initialization error:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state changed:", event, !!session);
        setIsAuthenticated(!!session);
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, [supabase]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const value: AuthContextValue = {
    isAuthenticated,
    isLoading,
    user,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Simple auth status component for testing
export function AuthStatus() {
  const { isAuthenticated, isLoading, user, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          🔄 Checking authentication...
        </p>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg ${
      isAuthenticated 
        ? 'bg-green-50 dark:bg-green-900/20' 
        : 'bg-blue-50 dark:bg-blue-900/20'
    }`}>
      <p className={`text-sm ${
        isAuthenticated 
          ? 'text-green-700 dark:text-green-300' 
          : 'text-blue-700 dark:text-blue-300'
      }`}>
        {isAuthenticated ? (
          <>
            ✅ Authenticated as: {user?.email || 'User'}
            <button 
              onClick={signOut}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            🔓 Not authenticated
            <a 
              href="/login" 
              className="ml-2 text-xs underline hover:no-underline"
            >
              Sign in
            </a>
          </>
        )}
      </p>
    </div>
  );
}