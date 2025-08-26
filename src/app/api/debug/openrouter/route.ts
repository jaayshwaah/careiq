// src/app/api/debug/openrouter/route.ts
import { NextResponse } from "next/server";
import { getORConfig, orModels } from "@/lib/openrouter";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cfg = getORConfig();
    const res = await orModels();
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          where: "openrouter",
          status: res.status,
          statusText: res.statusText,
          message:
            res.status === 401
              ? "Unauthorized from OpenRouter. Re-paste/rotate key in Vercel and redeploy."
              : "OpenRouter request failed.",
          details: {
            keyMasked: cfg.masked,
            siteUrl: cfg.siteUrl,
            siteName: cfg.siteName,
            data: json ?? text?.slice(0, 800),
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "OpenRouter reachable and key accepted.",
      details: {
        keyMasked: cfg.masked,
        siteUrl: cfg.siteUrl,
        siteName: cfg.siteName,
        sampleModelCount: Array.isArray(json?.data) ? json.data.length : undefined,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        where: "env/runtime",
        message: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}
