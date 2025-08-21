// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase, setAuthPersistence } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getBrowserSupabase();

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true); // remember me default
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // If we arrive from a magic link, Supabase handles the hash and sets the session.
  // We can then bounce the user to the app.
  useEffect(() => {
    // If there's already a session, skip this screen
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/");
    })();
  }, [router, supabase]);

  // Keep persistence in sync with the checkbox
  useEffect(() => {
    setAuthPersistence(keepSignedIn ? "local" : "session");
  }, [keepSignedIn]);

  async function loginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      router.replace("/");
    } catch (e: any) {
      setErr(e?.message ?? "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        (typeof window !== "undefined" ? window.location.origin : "");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: appUrl ? `${appUrl}/login` : undefined },
      });
      if (error) throw error;
      setMsg("Magic link sent! Check your inbox.");
    } catch (e: any) {
      setErr(e?.message ?? "Could not send magic link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold mb-6">Sign in to CareIQ</h1>

      <div className="mb-4 flex gap-2">
        <button
          className={`px-3 py-1 rounded border ${mode === "password" ? "bg-black text-white" : ""}`}
          onClick={() => setMode("password")}
        >
          Password
        </button>
        <button
          className={`px-3 py-1 rounded border ${mode === "magic" ? "bg-black text-white" : ""}`}
          onClick={() => setMode("magic")}
        >
          Magic link
        </button>
      </div>

      <label className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          checked={keepSignedIn}
          onChange={(e) => setKeepSignedIn(e.target.checked)}
        />
        <span>Keep me signed in</span>
      </label>

      {mode === "password" ? (
        <form onSubmit={loginWithPassword} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="w-full rounded border px-3 py-2"
            type="password"
            placeholder="••••••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            className="w-full rounded border px-3 py-2"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <button
            className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
            disabled={loading}
            type="submit"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>
      )}

      {(msg || err) && (
        <p className={`mt-4 text-sm ${err ? "text-red-600" : "text-green-600"}`}>{msg || err}</p>
      )}
    </div>
  );
}
