// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs"; // ensure Node runtime for raw body
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const customerId = sub.customer as string;
        const price = Array.isArray(sub.items?.data) && sub.items.data[0]?.price;
        const supabaseUserId = (sub.metadata?.supabase_user_id as string) || undefined;

        // If no metadata, try to look up the user via customer id
        let userId = supabaseUserId;
        if (!userId) {
          const { data } = await supabaseAdmin
            .from("user_subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          userId = data?.user_id || undefined;
        }

        if (!userId) {
          console.warn("No matching user for subscription event");
          break;
        }

        await supabaseAdmin
          .from("user_subscriptions")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan_id: price?.id ?? null,
            status: sub.status ?? null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          }, { onConflict: "user_id" });

        break;
      }

      case "checkout.session.completed": {
        // Optional: If you want to catch successful checkouts
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
