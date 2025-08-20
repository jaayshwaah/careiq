// src/app/(auth)/update-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();

  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait a tick for detectSessionInUrl to process the hash params
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setErr("No active recovery session. Use the link from your email.");
      }
      setReady(true);
    }, 300);
    return () => clearTimeout(t);
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">Set new password</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <input
          type="password"
          required
          placeholder="New password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </main>
  );
}
