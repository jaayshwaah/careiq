export const runtime = "edge";
import { NextResponse } from "next/server";

function sanitizeEnv(val: string | undefined) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}
function getOrigin(siteUrl: string | undefined, fallback = "https://careiq.vercel.app") {
  const raw = sanitizeEnv(siteUrl) || fallback;
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

export async function GET() {
  const apiKey = sanitizeEnv(process.env.OPENROUTER_API_KEY);
  if (!apiKey) return NextResponse.json({ ok: false, reason: "no_api_key" }, { status: 200 });

  const site = getOrigin(process.env.SITE_URL);
  const resp = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Origin: site,
      Referer: site,
      "HTTP-Referer": site,
      "X-Title": "CareIQ",
    } as Record<string, string>,
  });

  const text = await resp.text().catch(() => "");
  return NextResponse.json({
    ok: resp.ok,
    status: resp.status,
    // short sample so we don't spam logs
    bodySample: text.slice(0, 600),
    site,
  });
}
