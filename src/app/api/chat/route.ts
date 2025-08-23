// src/app/api/chat/route.ts
import { NextRequest } from "next/server";
import {
  CHAT_MODEL,
  SYSTEM_PROMPT,
  getOpenRouterClient,
  type ChatMessage,
} from "@/lib/modelRouter";

export const runtime = "edge";

/**
 * POST /api/chat
 * Body: { messages: ChatMessage[], attachments?: {name,type,size,text?}[] }
 * Streams SSE chunks compatible with fetch(reader) client.
 */
export async function POST(req: NextRequest) {
  try {
    const { messages = [], attachments = [] } = await req.json();

    const chat: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(messages) ? messages : []),
      ...(Array.isArray(attachments) && attachments.length
        ? [
            {
              role: "system",
              content:
                "User also provided the following attachment metadata. If helpful, reference it briefly:\n" +
                attachments
                  .map(
                    (a: any, i: number) =>
                      `#${i + 1}: ${a.name} (${a.type}, ${a.size} bytes)${
                        a?.text ? `\nExtracted text: ${truncate(a.text, 1200)}` : ""
                      }`
                  )
                  .join("\n\n"),
            },
          ]
        : []),
    ];

    const client = getOpenRouterClient();

    // Use the low-level fetch for stream passthrough (works great on Edge)
    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client.apiKey}`,
        "HTTP-Referer": (client as any).defaultHeaders?.["HTTP-Referer"] || "",
        "X-Title": (client as any).defaultHeaders?.["X-Title"] || "",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        stream: true,
        temperature: 0.3,
        max_tokens: 2048,
        messages: chat,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(
        JSON.stringify({ ok: false, error: `Upstream error: ${upstream.status} ${text}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pipe OpenRouter SSE stream to client unchanged
    const readable = upstream.body as ReadableStream<Uint8Array>;
    const headers = {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };

    return new Response(readable, { status: 200, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function truncate(s: string, n = 1200) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}
