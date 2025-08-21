export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ ok: true, title: "New chat" }); // graceful fallback
    }

    const model =
      process.env.OPENROUTER_TITLE_MODEL ||
      "openai/gpt-4o-mini"; // or "mistralai/mistral-small"

    const system =
      "You write ultra-brief, human-friendly chat titles (3–5 words). Remove jargon, names, URLs, and emojis.";

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://careiq.local",
        "X-Title": "CareIQ Title",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text.slice(0, 500) },
        ],
        temperature: 0.2,
        max_tokens: 12,
      }),
    });

    const j = await r.json();
    const title =
      j?.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") ||
      "New chat";

    return NextResponse.json({ ok: true, title });
  } catch (err: any) {
    return NextResponse.json({ ok: true, title: "New chat" });
  }
}
