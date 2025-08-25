// src/app/api/chat/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure server envs available

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function assertEnv() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is missing. Add it in Vercel → Project → Settings → Environment Variables and redeploy."
    );
  }
  return {
    key,
    siteUrl: process.env.OPENROUTER_SITE_URL || "",
    siteName: process.env.OPENROUTER_SITE_NAME || "CareIQ",
    model: process.env.OPENROUTER_MODEL || "openai/gpt-5-chat",
  };
}

export async function POST(req: Request) {
  let env: ReturnType<typeof assertEnv>;
  try {
    env = assertEnv();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const model = body?.model || env.model;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.siteUrl || "https://example.com",
        "X-Title": env.siteName,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false, // keep false for simpler surfacing of errors; flip to true if you stream
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const hint =
        res.status === 401
          ? "Unauthorized from OpenRouter. Verify the API key in Vercel (no quotes, no spaces) and that you redeployed after adding it. You can also hit /api/debug/openrouter to confirm."
          : `OpenRouter error ${res.status}.`;
      return NextResponse.json({ error: hint, detail: text.slice(0, 1000) }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Network error contacting OpenRouter.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
