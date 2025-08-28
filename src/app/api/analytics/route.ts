export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, facility_name, facility_state, role")
      .eq("user_id", user.id)
      .single();

    const last7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { count: totalChats } = await supa.from("chats").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    const { count: recentChats } = await supa.from("chats").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", last7);
    const { data: msgStats } = await supa.rpc("get_user_message_stats", { p_user_id: user.id });
    const { count: kbCount } = await supa.from("knowledge_base").select("id", { count: "exact", head: true }).eq("facility_id", profile?.facility_id || null);

    const analytics = {
      overview: {
        totalChats: totalChats || 0,
        recentChats: recentChats || 0,
        totalMessages: msgStats?.[0]?.total_messages || 0,
        avgMessagesPerChat: msgStats?.[0]?.avg_messages_per_chat || 0,
        knowledgeBaseItems: kbCount || 0,
      },
      userContext: { role: profile?.role, facility: profile?.facility_name, state: profile?.facility_state },
    };

    return NextResponse.json({ ok: true, analytics });
  } catch (error: any) {
    console.error("analytics error", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

