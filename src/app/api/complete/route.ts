import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages, model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct" } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "messages[] required" }, { status: 400 });
    }
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ"
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ ok: false, status: resp.status, error: text }, { status: 500 });
    }
    const json = await resp.json();
    return NextResponse.json({ ok: true, data: json });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err.message || "unknown error" }, { status: 500 });
  }
}
