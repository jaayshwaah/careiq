// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Body = { priceId: string };

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const { priceId } = (await req.json()) as Body;
    if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });

    // We need the authed user id. Expect a Supabase JWT in cookies (Next.js middleware handles it in your app).
    // If you don't have it wired, accept a bearer token header or move this to a server action with supabaseServerClient.
    const supabaseJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!supabaseJwt)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Validate token and get user
    const supabase = supabaseAdmin; // using admin to decode is fine; or use supabase.auth.getUser on client before calling this route
    const { data: { user }, error: userErr } = await supabase.auth.getUser(supabaseJwt);
    if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get or create Stripe customer for this user
    const { data: subRow } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = subRow?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Upsert row with new customer id
      await supabase.from("user_subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
      }, { onConflict: "user_id" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=1`,
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
