// src/components/RequireAuth.tsx
"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode; // optional custom login UI
};

export default function RequireAuth({ children, fallback }: Props) {
  const supabase = getBrowserSupabase();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1) Read existing session from localStorage (persistSession: true)
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setAuthed(!!data.session);

      // 2) Listen for auth state changes (token refresh, sign in/out)
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setAuthed(!!session);
      });

      setLoading(false);

      return () => {
        sub.subscription.unsubscribe();
      };
    }

    init();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    // IMPORTANT: Don’t force hard navigation. Let user sign in without losing app state.
    return (
      fallback ?? (
        <div className="flex h-dvh flex-col items-center justify-center gap-4">
          <div className="text-lg font-semibold">Sign in to continue</div>
          <button
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-950"
            onClick={async () => {
              // Send to your /login page or start OAuth here.
              // Example: email magic link or OAuth:
              // await supabase.auth.signInWithOAuth({ provider: "google" });
              window.location.href = "/login";
            }}
          >
            Go to Login
          </button>
        </div>
      )
    );
  }

  return <>{children}</>;
}
