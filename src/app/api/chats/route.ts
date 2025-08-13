export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

// POST /api/chats -> create a new chat
export async function POST() {
  const supabase = createClientServer();
  const title = "New chat";

  const { data, error } = await supabase
    .from("chats")
    .insert({ title })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...data });
}

// GET /api/chats
// - Without params: returns list of chats (newest first)
// - With ?id=<chatId>: returns { chat, messages } for that chat
export async function GET(req: NextRequest) {
  const supabase = createClientServer();
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const { data: chat, error: chatErr } = await supabase
      .from("chats")
      .select("*")
      .eq("id", id)
      .single();

    if (chatErr) {
      return NextResponse.json({ ok: false, error: chatErr.message }, { status: 404 });
    }

    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", id)
      .order("created_at", { ascending: true });

    if (msgErr) {
      return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chat, messages });
  }

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
