// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // If already signed in, bounce to home
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/";
    });
  }, [supabase]);

  async function signInWithMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Update to your production URL in Supabase Auth settings too
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/`
              : undefined,
        },
      });
      if (error) throw error;
      setMsg("Check your email for the sign-in link.");
    } catch (err: any) {
      setMsg(err?.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/`
              : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setMsg(err?.message || "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-6">
      <h1 className="mb-6 text-2xl font-semibold">Sign in to CareIQ</h1>

      <form onSubmit={signInWithMagicLink} className="space-y-3">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Sending link…" : "Send magic link"}
        </button>
      </form>

      <div className="my-4 text-center text-sm text-neutral-500">or</div>

      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm disabled:opacity-50 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950"
      >
        Continue with Google
      </button>

      {msg && <div className="mt-4 text-sm text-neutral-600">{msg}</div>}

      <div className="mt-8 text-sm text-neutral-500">
        <Link className="underline" href="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}
