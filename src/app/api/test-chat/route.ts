export const runtime = "edge";
import { NextResponse } from "next/server";

function sanitize(val?: string) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}
function originOf(url?: string, fallback = "https://careiq.vercel.app") {
  const raw = sanitize(url) || fallback;
  try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ""); }
}

export async function GET() {
  const apiKey = sanitize(process.env.OPENROUTER_API_KEY);
  const model = sanitize(process.env.OPENROUTER_MODEL) || "openrouter/auto";
  const site = originOf(process.env.SITE_URL);

  if (!apiKey) return NextResponse.json({ ok: false, reason: "no_api_key" });

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Origin: site,
      Referer: site,
      "X-Title": "CareIQ",
    } as Record<string, string>,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Say hi in one short sentence." }],
      max_tokens: 50,
      temperature: 0.2,
    }),
  });

  const text = await resp.text().catch(() => "");
  return NextResponse.json({
    ok: resp.ok,
    status: resp.status,
    sample: text.slice(0, 600),
    model,
    site,
  });
}
