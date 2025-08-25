// src/app/api/chat/route.ts
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing OPENROUTER_API_KEY in environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages = [] } = await req.json();

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-chat",
      messages,
    }),
  });

  if (!r.ok) {
    const text = await r.text();
    return new Response(JSON.stringify({ ok: false, error: text }), {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const j = await r.json();
  return new Response(JSON.stringify(j), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
