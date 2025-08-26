// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { getORConfig, OPENROUTER_URL } from "@/lib/openrouter";

export const runtime = "nodejs"; // ensure server env and streaming support

type ORMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const messages: ORMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const modelFromBody: string | undefined = body?.model;

  // Assert env
  let cfg: ReturnType<typeof getORConfig>;
  try {
    cfg = getORConfig();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }

  // Stream from OpenRouter
  const upstream = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": cfg.siteUrl,
      "X-Title": cfg.siteName,
    },
    body: JSON.stringify({
      model: modelFromBody || cfg.chatModel,
      messages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    let text = "";
    try {
      text = await upstream.text();
    } catch {}
    const hint =
      upstream.status === 401
        ? "Unauthorized from OpenRouter. Verify OPENROUTER_API_KEY in Vercel (no quotes/spaces), rotate if needed, then redeploy. See /api/debug/openrouter."
        : `OpenRouter error ${upstream.status}.`;
    return NextResponse.json({ error: hint, detail: text.slice(0, 1000) }, { status: 500 });
  }

  // Pass SSE through to the browser
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
