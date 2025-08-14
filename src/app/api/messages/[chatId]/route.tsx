export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

/**
 * GET /api/messages/[chatId]
 * Returns messages for a chat in ascending chronological order.
 */
export async function GET(_: Request, { params }: { params: { chatId: string } }) {
  const supabase = createClientServer();
  const chatId = params.chatId;

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, messages: data ?? [] });
}

/**
 * POST /api/messages/[chatId]
 * Body: { content: string }
 * Inserts the user message, calls /api/chat to get assistant reply (non-stream),
 * saves it, and returns the assistant message JSON for clients that don't handle streams.
 */
export async function POST(req: Request, { params }: { params: { chatId: string } }) {
  const supabase = createClientServer();
  const chatId = params.chatId;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const content = (body?.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ ok: false, error: "content required" }, { status: 400 });
  }

  // 1) Insert the user message
  const { data: userMsg, error: insErr } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, role: "user", content })
    .select("*")
    .single();

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  // 2) Ask the assistant. Prefer OpenRouter if configured; otherwise fall back to a local echo.
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  let assistantText = "";

  if (apiKey) {
    // Gather recent history (keep it lightweight)
    const { data: hist } = await supabase
      .from("messages")
      .select("role,content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(30);

    const messages = (hist ?? []).map((m: any) => ({ role: m.role, content: m.content }));

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://careiq",
        "X-Title": "CareIQ Chat",
      } as Record<string, string>,
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
        messages,
        stream: false,
      }),
    });

    if (!resp.ok) {
      assistantText = `Sorry — the model call failed (${resp.status}).`;
    } else {
      const json = await resp.json().catch(() => null);
      assistantText =
        json?.choices?.[0]?.message?.content?.toString?.() ||
        "I'm here. How can I help?";
    }
  } else {
    // Local fallback so the UI works without an API key/credits.
    assistantText = `You said: "${content}"`;
  }

  // 3) Save assistant message and return it
  const { data: assistMsg, error: saveErr } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, role: "assistant", content: assistantText })
    .select("*")
    .single();

  if (saveErr) {
    return NextResponse.json({ ok: false, error: saveErr.message }, { status: 500 });
  }

  return NextResponse.json(assistMsg);
}
