// src/app/api/debug/openrouter/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node runtime so server envs are available

function mask(key?: string | null) {
  if (!key) return "";
  const shown = 6;
  return key.length <= shown ? "********" : `${"*".repeat(Math.max(0, key.length - shown))}${key.slice(-shown)}`;
}

export async function GET() {
  const key = process.env.OPENROUTER_API_KEY || "";
  const siteUrl = process.env.OPENROUTER_SITE_URL || "";
  const siteName = process.env.OPENROUTER_SITE_NAME || "";
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";

  const info: any = {
    hasKey: Boolean(key),
    keyMasked: mask(key),
    siteUrl,
    siteName,
    model,
  };

  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        where: "env",
        message:
          "OPENROUTER_API_KEY missing at runtime. In Vercel > Project > Settings > Environment Variables, add it (Production/Preview/Development) and redeploy.",
        details: info,
      },
      { status: 500 }
    );
  }

  // Try a real request to OpenRouter so we know the key works from THIS deployment
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": siteUrl || "https://example.com",
        "X-Title": siteName || "CareIQ",
      },
      // Avoid hanging forever
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON, include text
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          where: "openrouter",
          status: res.status,
          statusText: res.statusText,
          message:
            res.status === 401
              ? "OpenRouter says Unauthorized. Double‑check the API key value in Vercel (no extra spaces) or rotate the key."
              : "OpenRouter request failed.",
          details: { ...info, response: json ?? text?.slice(0, 1000) },
        },
        { status: 500 }
      );
    }

    // success
    return NextResponse.json({
      ok: true,
      message: "OpenRouter reachable and key accepted.",
      details: {
        ...info,
        sampleModelCount: Array.isArray(json?.data) ? json.data.length : undefined,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        where: "network",
        message: "Network error contacting OpenRouter from this deployment.",
        details: { ...info, error: String(err?.message || err) },
      },
      { status: 500 }
    );
  }
}
