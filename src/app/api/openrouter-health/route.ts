// src/app/api/openrouter-health/route.ts
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(_req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return new Response("No OPENROUTER_API_KEY", { status: 500 });
  }

  const r = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const text = await r.text();
  return new Response(text, { status: r.status });
}
