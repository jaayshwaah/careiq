// src/app/api/chat/route.ts
import { NextRequest } from "next/server";
import {
  CHAT_MODEL,
  SYSTEM_PROMPT,
  getOpenRouterClient,
  type ChatMessage,
} from "@/lib/modelRouter";

export const runtime = "edge";

const RETRIES = 2;
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages = [], attachments = [] } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return json(400, {
        ok: false,
        error: "No messages provided. The request body must include { messages: ChatMessage[] }.",
      });
    }

    // Validate env (Edge reads from Vercel env — set them in Project → Settings → Environment Variables)
    let apiKey = "";
    let referer = "";
    let title = "";
    try {
      const client = getOpenRouterClient();
      apiKey = (client as any).apiKey || "";
      referer = (client as any).defaultHeaders?.["HTTP-Referer"] || "";
      title = (client as any).defaultHeaders?.["X-Title"] || "";
    } catch (e: any) {
      return json(500, {
        ok: false,
        error:
          "OPENROUTER_API_KEY is not configured on the server. Add it in Vercel → Settings → Environment Variables.",
      });
    }
    if (!apiKey) {
      return json(500, {
        ok: false,
        error:
          "OPENROUTER_API_KEY is empty. Add it in Vercel → Settings → Environment Variables.",
      });
    }

    const chat: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
      ...(Array.isArray(attachments) && attachments.length
        ? [
            {
              role: "system",
              content:
                "Attachment context (summarize/quote sparingly if relevant):\n" +
                attachments
                  .map(
                    (a: any, i: number) =>
                      `#${i + 1}: ${a.name} (${a.type || "file"}, ${a.size || 0} bytes)${
                        a?.text ? `\nExtracted text: ${truncate(a.text, 1200)}` : ""
                      }`
                  )
                  .join("\n\n"),
            },
          ]
        : []),
    ];

    // Try upstream with small backoff/retries.
    let lastRes: Response | null = null;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      lastRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": referer,
          "X-Title": title,
        },
        body: JSON.stringify({
          model: CHAT_MODEL, // defaults to "openai/gpt-5-chat"
          stream: true,
          // A little resilience: let OpenRouter fall back to compatible routes if needed
          // (won't switch models; just infra path fallbacks).
          allow_fallbacks: true,
          temperature: 0.3,
          max_tokens: 2048,
          messages: chat,
        }),
      });

      if (lastRes.ok && lastRes.body) {
        // Stream straight through
        const readable = lastRes.body as ReadableStream<Uint8Array>;
        return new Response(readable, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      }

      const status = lastRes.status;
      if (!RETRYABLE.has(status) || attempt === RETRIES) break;

      await sleep(300 * (attempt + 1));
    }

    // If we’re here, upstream failed.
    const text = lastRes ? await safeText(lastRes) : "No response from OpenRouter";
    return json(502, {
      ok: false,
      error: `OpenRouter error (${lastRes?.status ?? "?"}): ${text}`,
      hint: envHint(),
    });
  } catch (err: any) {
    return json(500, {
      ok: false,
      error: String(err?.message || err),
      hint: envHint(),
    });
  }
}

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function truncate(s: string, n = 1200) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "(failed to read error body)";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function envHint() {
  return "Confirm OPENROUTER_API_KEY is set for this Vercel environment (Preview/Production). Also ensure OPENROUTER_SITE_URL and OPENROUTER_SITE_NAME are optional but recommended.";
}
