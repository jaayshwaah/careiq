import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Search sessions by title; empty q => recent sessions */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") || (q ? "20" : "6"), 10), 50);

  if (!q) {
    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("id,title,updated_at,last_message_at")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ chats: data ?? [] });
  }

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("id,title,updated_at,last_message_at")
    .ilike("title", `%${q}%`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chats: data ?? [] });
}
