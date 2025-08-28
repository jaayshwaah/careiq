// src/app/api/stripe/create-portal-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const supabaseJwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!supabaseJwt)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = supabaseAdmin;
    const { data: { user } } = await supabase.auth.getUser(supabaseJwt);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: subRow, error } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !subRow?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 404 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: subRow.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Error" }, { status: 500 });
  }
}
