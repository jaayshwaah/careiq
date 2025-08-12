import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** List recent chat sessions */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .select("id,title,created_at,updated_at,last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ chats: data ?? [] });
}

/** Create a new empty chat session and return its id */
export async function POST(req: Request) {
  let title = "New Chat";
  try {
    const body = await req.json().catch(() => ({} as any));
    if (typeof body?.title === "string" && body.title.trim()) title = body.title.trim();
  } catch {}

  const { data, error } = await supabaseAdmin
    .from("chat_sessions")
    .insert({ title })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data!.id });
}
