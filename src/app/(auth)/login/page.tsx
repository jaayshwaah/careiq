// src/app/(auth)/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserSupabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "magic" | "forgot";

export default function LoginPage() {
  const supabase = getBrowserSupabase();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // already signed in? go home
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/";
    });
  }, [supabase]);

  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/` : undefined;

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/";
    } catch (err: any) {
      setMsg(err?.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signUpPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (password !== confirm) throw new Error("Passwords do not match.");
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMsg("Check your email to confirm your account.");
      setMode("signin");
    } catch (err: any) {
      setMsg(err?.message || "Sign-up failed.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setMsg("Magic link sent. Check your email.");
    } catch (err: any) {
      setMsg(err?.message || "Could not send magic link.");
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      });
      if (error) throw error;
      setMsg("Password reset email sent. Check your inbox.");
    } catch (err: any) {
      setMsg(err?.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
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

      {/* Mode switcher */}
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900/60">
        <TabButton label="Password" active={mode === "signin" || mode === "signup"} onClick={() => setMode("signin")} />
        <TabButton label="Sign up" active={mode === "signup"} onClick={() => setMode("signup")} />
        <TabButton label="Magic link" active={mode === "magic"} onClick={() => setMode("magic")} />
        <TabButton label="Forgot" active={mode === "forgot"} onClick={() => setMode("forgot")} />
      </div>

      {/* Forms */}
      {mode === "signin" && (
        <form onSubmit={signInPassword} className="space-y-3">
          <FieldEmail value={email} setValue={setEmail} />
          <FieldPassword
            label="Password"
            value={password}
            setValue={setPassword}
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-right text-sm">
            <button
              type="button"
              className="text-neutral-600 underline"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}

      {mode === "signup" && (
        <form onSubmit={signUpPassword} className="space-y-3">
          <FieldEmail value={email} setValue={setEmail} />
          <FieldPassword
            label="Password"
            value={password}
            setValue={setPassword}
            autoComplete="new-password"
          />
          <FieldPassword
            label="Confirm password"
            value={confirm}
            setValue={setConfirm}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
        </form>
      )}

      {mode === "magic" && (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <FieldEmail value={email} setValue={setEmail} />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Sending…" : "Send magic link"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={forgotPassword} className="space-y-3">
          <FieldEmail value={email} setValue={setEmail} />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Sending reset…" : "Send reset email"}
          </button>
        </form>
      )}

      <div className="my-4 text-center text-sm text-neutral-500">or</div>

      <button
        onClick={signInGoogle}
        disabled={busy}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm disabled:opacity-50 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950"
      >
        Continue with Google
      </button>

      {msg && <div className="mt-4 text-sm text-neutral-700 dark:text-neutral-300">{msg}</div>}

      <div className="mt-8 text-sm text-neutral-500">
        <Link className="underline" href="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------- small helpers ---------------------------- */

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2 py-1.5 text-center text-sm transition",
        active
          ? "bg-white font-medium shadow-sm ring-1 ring-black/10 dark:bg-neutral-950 dark:ring-white/10"
          : "text-neutral-600 hover:bg-white/60 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
      )}
    >
      {label}
    </button>
  );
}

function FieldEmail({
  value,
  setValue,
}: {
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      Email
      <input
        type="email"
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
      />
    </label>
  );
}

function FieldPassword({
  label,
  value,
  setValue,
  autoComplete,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-sm">
      {label}
      <div className="mt-1 flex items-center gap-2">
        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="rounded-md px-2 py-1 text-xs text-neutral-600 ring-1 ring-black/10 hover:bg-neutral-100 dark:text-neutral-300 dark:ring-white/10 dark:hover:bg-neutral-800"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
