export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";
import { generateChatTitle } from "@/lib/title";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClientServer();
  const id = params.id;
  const { data, error } = await supabase.from("chats").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
  return NextResponse.json({ ok: true, chat: data });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClientServer();
  const id = params.id;
  let body: any = null;
  try {
    body = await req.json();
  } catch {}

  const now = new Date().toISOString();

  // Load current chat to decide whether to update
  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .select("id,title")
    .eq("id", id)
    .single();

  if (chatErr) {
    return NextResponse.json({ ok: false, error: chatErr.message }, { status: 404 });
  }

  const currentTitle = (chat?.title ?? "").trim();

  // Case 1: explicit title provided
  if (typeof body?.title === "string" && body.title.trim()) {
    const title = body.title.trim();
    const { data, error } = await supabase
      .from("chats")
      .update({ title, updated_at: now })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, chat: data });
  }

  // Case 2: derive from provided firstMessage
  if (typeof body?.firstMessage === "string" && body.firstMessage.trim()) {
    // Only set if still default
    if (!currentTitle || /^new chat$/i.test(currentTitle)) {
      const title = generateChatTitle(body.firstMessage);
      const { data, error } = await supabase
        .from("chats")
        .update({ title, updated_at: now })
        .eq("id", id)
        .select("*")
        .single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, chat: data });
    }
    return NextResponse.json({ ok: true, chat });
  }

  // Case 3: derive = true -> look up first user message in DB and set title if default
  if (body?.derive) {
    if (!currentTitle || /^new chat$/i.test(currentTitle)) {
      const { data: firstMsg, error: msgErr } = await supabase
        .from("messages")
        .select("content")
        .eq("chat_id", id)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (msgErr) return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
      const content = firstMsg?.content?.toString?.() || "";
      if (content) {
        const title = generateChatTitle(content);
        const { data, error } = await supabase
          .from("chats")
          .update({ title, updated_at: now })
          .eq("id", id)
          .select("*")
          .single();
        if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true, chat: data });
      }
    }
    return NextResponse.json({ ok: true, chat });
  }

  return NextResponse.json({ ok: false, error: "No changes provided" }, { status: 400 });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClientServer();
  const id = params.id;
  const { error } = await supabase.from("chats").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
