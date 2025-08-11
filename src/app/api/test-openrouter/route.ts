export const runtime = "edge";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  let site = process.env.SITE_URL || "https://careiq.vercel.app";
  try { site = new URL(site).origin; } catch { site = site.replace(/\/+$/, ""); }

  if (!apiKey) return NextResponse.json({ ok: false, reason: "no_api_key" }, { status: 200 });

  const resp = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Referer: site,
      "HTTP-Referer": site,
      "X-Title": "CareIQ",
    } as Record<string, string>,
  });

  const text = await resp.text();
  return NextResponse.json({ ok: resp.ok, status: resp.status, bodySample: text.slice(0, 500) });
}
