// src/app/api/chat-proxy/route.ts
import { NextRequest } from "next/server";
import {
  CHAT_MODEL,
  SYSTEM_PROMPT,
  getOpenRouterClient,
  type ChatMessage,
} from "@/lib/modelRouter";

// Edge runtime for low-latency
export const runtime = "edge";

/**
 * Simple non-streaming proxy endpoint for “one-shot” calls.
 * Body: { messages: ChatMessage[] }
 * Returns: { ok: true, content: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { messages = [] } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return json(400, { ok: false, error: "No messages provided" });
    }

    const client = getOpenRouterClient();
    const apiKey = (client as any).apiKey as string | undefined;
    if (!apiKey) {
      return json(500, {
        ok: false,
        error: "OPENROUTER_API_KEY is not set on the server.",
      });
    }

    const body = {
      model: CHAT_MODEL,
      stream: false,
      temperature: 0.3,
      max_tokens: 2048,
      messages: ([{ role: "system", content: SYSTEM_PROMPT }] as ChatMessage[]).concat(messages),
    };

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": (client as any).defaultHeaders?.["HTTP-Referer"] || "",
        "X-Title": (client as any).defaultHeaders?.["X-Title"] || "",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await safeText(r);
      return json(r.status, { ok: false, error: `Upstream error: ${r.status} ${text}` });
    }

    const j = await r.json();
    const content: string =
      j?.choices?.[0]?.message?.content ??
      j?.choices?.[0]?.delta?.content ??
      "";

    return json(200, { ok: true, content });
  } catch (err: any) {
    return json(500, { ok: false, error: String(err?.message || err) });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "(failed to read body)";
  }
}
