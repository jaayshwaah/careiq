export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

function sanitize(v?: string) {
  return v?.trim().replace(/^['"]|['"]$/g, "");
}
function originOf(url?: string, fallback = "https://careiq-eight.vercel.app") {
  const raw = sanitize(url) || fallback;
  try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ""); }
}

export async function GET() {
  try {
    const apiKey = sanitize(process.env.OPENROUTER_API_KEY);
    const model = sanitize(process.env.OPENROUTER_MODEL) || "meta-llama/llama-3.1-8b-instruct";
    const site = originOf(process.env.SITE_URL, "https://careiq-eight.vercel.app");

    if (!apiKey) {
      return NextResponse.json({ ok: false, status: 401, error: "No OPENROUTER_API_KEY set" }, { status: 401 });
    }

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": site,
        "X-Title": "CareIQ",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Say 'ping'." }],
        max_tokens: 3,
      }),
    });

    const text = await r.text();
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      model,
      site,
      bodySample: text.slice(0, 300),
    }, { status: r.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, status: 500, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
