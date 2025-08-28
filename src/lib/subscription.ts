// src/lib/subscription.ts
import { createClient } from "@supabase/supabase-js";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | null;

type SubRow = {
  user_id: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
};

export async function getBrowserSupabase() {
  const { createClient: createBrowserClient } = await import("@supabase/supabase-js");
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function userHasActiveSubscription(): Promise<boolean> {
  const supabase = await getBrowserSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("status,current_period_end")
    .eq("user_id", user.id)
    .maybeSingle<SubRow>();

  if (error || !data) return false;

  const active = (data.status === "active" || data.status === "trialing");
  const notExpired =
    !data.current_period_end || new Date(data.current_period_end).getTime() > Date.now();

  return active && notExpired;
}
