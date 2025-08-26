// src/app/api/messages/stream/route.ts
import { NextResponse } from "next/server";
import { orChatComplete, getORConfig, ORMessage } from "@/lib/openrouter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // If you truly stream with SSE, adapt this to your existing EventStream pipeline.
  // For now, we’ll do a simple non-stream call but keep the same endpoint shape.
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const messages: ORMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const model = body?.model;

  try {
    getORConfig(); // asserts env exists
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }

  try {
    const res = await orChatComplete(messages, model, false);
    const text = await res.text();
    if (!res.ok) {
      const hint =
        res.status === 401
          ? "Unauthorized from OpenRouter. Check OPENROUTER_API_KEY in Vercel and redeploy. See /api/debug/openrouter."
          : `OpenRouter error ${res.status}.`;
      return NextResponse.json({ error: hint, detail: text?.slice(0, 1000) }, { status: 500 });
    }
    return new NextResponse(text, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Network error contacting OpenRouter.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
