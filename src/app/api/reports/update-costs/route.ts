// Update Cost Analytics API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.WRITE);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // Update cost analytics from invoice data
    const { error: updateError } = await supa
      .rpc('update_cost_analytics_from_invoice', {
        invoice_id_param: invoice_id
      });

    if (updateError) {
      console.error('Error updating cost analytics:', updateError);
      return NextResponse.json({ 
        error: "Failed to update cost analytics",
        details: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Cost analytics updated successfully" 
    });

  } catch (error: any) {
    console.error('Update cost analytics error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
