// Feature Request Voting API
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

    const { request_id } = await req.json();

    if (!request_id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    // Check if user has already voted
    const { data: existingVote } = await supa
      .from('feature_request_votes')
      .select('id')
      .eq('request_id', request_id)
      .eq('user_id', user.id)
      .single();

    if (existingVote) {
      // Remove vote (toggle)
      const { error: deleteError } = await supa
        .from('feature_request_votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        console.error('Error removing vote:', deleteError);
        return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "Vote removed",
        voted: false 
      });
    } else {
      // Add vote
      const { error: insertError } = await supa
        .from('feature_request_votes')
        .insert({
          request_id,
          user_id: user.id
        });

      if (insertError) {
        console.error('Error adding vote:', insertError);
        return NextResponse.json({ error: "Failed to add vote" }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "Vote added",
        voted: true 
      });
    }

  } catch (error: any) {
    console.error('Vote feature request error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
