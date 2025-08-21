// src/components/RequireAuth.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let unsub: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      // Fast path: do we already have a session cached?
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        if (!cancelled) setReady(true);
      } else {
        // If no session, ensure we listen for auth events (e.g. magic link callback)
        const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
          if (!sess) router.replace("/login");
          else setReady(true);
        });
        unsub = () => sub.subscription.unsubscribe();

        // Also redirect immediately if clearly unauthenticated
        router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [router]);

  if (!ready) return null; // replace with a small spinner if you want
  return <>{children}</>;
}
