// src/components/RequireAuth.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";

/**
 * Waits for Supabase to restore session from localStorage before redirecting.
 * Prevents "forced login every refresh" behavior.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasSession(!!data.session);
      setChecked(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setHasSession(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, [supabase]);

  // While restoring, don't kick user out.
  if (!checked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (!hasSession) {
    if (pathname !== "/login") router.replace("/login");
    return null;
  }

  return <>{children}</>;
}
