// src/components/BillingButtons.tsx
"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/subscription";

type Props = {
  priceId: string; // your Stripe Price ID for the plan (e.g., price_123)
};

export default function BillingButtons({ priceId }: Props) {
  const [loading, setLoading] = useState(false);

  async function withAuthHeader(): Promise<HeadersInit> {
    const supabase = await getBrowserSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not logged in");
    return { Authorization: `Bearer ${session.access_token}` };
    }

  const startCheckout = async () => {
    try {
      setLoading(true);
      const headers = await withAuthHeader();
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ priceId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error starting checkout");
      window.location.href = json.url;
    } catch (e: any) {
      alert(e.message || "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      setLoading(true);
      const headers = await withAuthHeader();
      const res = await fetch("/api/stripe/create-portal-link", {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error opening portal");
      window.location.href = json.url;
    } catch (e: any) {
      alert(e.message || "Could not open portal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={startCheckout}
        disabled={loading}
        className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-60"
      >
        {loading ? "Loading…" : "Subscribe"}
      </button>
      <button
        onClick={openPortal}
        disabled={loading}
        className="rounded-xl px-4 py-2 border border-neutral-300 bg-white disabled:opacity-60"
      >
        {loading ? "Loading…" : "Manage billing"}
      </button>
    </div>
  );
}
