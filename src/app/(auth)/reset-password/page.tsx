// src/app/(auth)/reset-password/page.tsx
"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export const dynamic = 'error';

export default function ResetPasswordPage() {
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/update-password`
            : undefined,
      });
      if (error) throw error;
      setMsg("Password reset email sent. Check your inbox.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">Reset password</h1>
      <p className="mb-4 text-sm text-neutral-600">We’ll email you a reset link.</p>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
    </main>
  );
}
