// src/app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login`
              : undefined,
        },
      });
      if (error) throw error;

      if (data.user && !data.session) {
        // Email confirmations enabled
        setMsg("Account created! Check your email to confirm, then sign in.");
      } else {
        router.replace("/");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-neutral-600">Join CareIQ</p>
      </div>

      <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 space-y-3">
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6 characters)"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-black px-4 py-2 text-white transition hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}

      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account? <a className="underline" href="/login">Sign in</a>
      </p>
    </main>
  );
}
