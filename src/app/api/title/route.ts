// src/app/api/title/route.ts
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { AUTO_TITLE_MODEL, getOpenRouterClient } from "@/lib/modelRouter";

/**
 * POST /api/title
 * Body: { text: string }
 * Returns { ok: true, title: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ ok: false, error: "text required" }, { status: 400 });
    }

    let title = "New chat";
    try {
      const client = getOpenRouterClient();
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${client.apiKey}`,
          "HTTP-Referer": (client as any).defaultHeaders?.["HTTP-Referer"] || "",
          "X-Title": (client as any).defaultHeaders?.["X-Title"] || "",
        },
        body: JSON.stringify({
          model: AUTO_TITLE_MODEL,
          messages: [
            {
              role: "system",
              content:
                "Write a very short (3–5 words) human-friendly chat title. No names, URLs, emojis, or quotes.",
            },
            { role: "user", content: text.slice(0, 1200) },
          ],
          temperature: 0.2,
          max_tokens: 12,
        }),
      });
      const j = await r.json();
      title =
        j?.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "") || "New chat";
      title = title.length > 44 ? title.slice(0, 41).trimEnd() + "…" : title;
    } catch {
      // fall through to default
    }

    return NextResponse.json({ ok: true, title });
  } catch (err: any) {
    return NextResponse.json({ ok: true, title: "New chat" });
  }
}
