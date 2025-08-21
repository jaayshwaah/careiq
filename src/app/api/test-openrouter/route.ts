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
  const model = sanitize(process.env.OPENROUTER_MODEL) || "openai/gpt-5-chat";
  const site = originOf(process.env.SITE_URL);

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      status: 401,
      sample: JSON.stringify({ error: { message: "No auth credentials found", code: 401 } }),
      model,
      site,
    });
  }

  const prompt = [{ role: "user", content: "Say 'ok' if you can hear me." }];

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": site,
      "X-Title": "CareIQ",
    },
    body: JSON.stringify({
      model,
      messages: prompt,
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
