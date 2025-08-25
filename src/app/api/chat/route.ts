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
    const { messages = [], attachments = [] } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json(400, { ok: false, error: "No messages provided" });
    }

    // validate env quickly (Edge runtime reads from Vercel env — set them in Vercel!)
    const client = getOpenRouterClient();
    const apiKey = (client as any).apiKey as string | undefined;
    if (!apiKey) {
      return json(500, {
        ok: false,
        error:
          "Missing OPENROUTER_API_KEY on the server. Set it in Vercel → Settings → Environment Variables.",
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

    // Try upstream with small backoff/retries
    let lastRes: Response | null = null;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      lastRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": (client as any).defaultHeaders?.["HTTP-Referer"] || "",
          "X-Title": (client as any).defaultHeaders?.["X-Title"] || "",
        },
        body: JSON.stringify({
          model: CHAT_MODEL, // "openai/gpt-5-chat" by default
          stream: true,
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

      // retry if retryable
      const status = lastRes.status;
      if (!RETRYABLE.has(status) || attempt === RETRIES) break;

      const backoff = 300 * (attempt + 1);
      await sleep(backoff);
    }

    // If we’re here, upstream failed
    const text = lastRes ? await safeText(lastRes) : "No response";
    return json(502, {
      ok: false,
      error: `OpenRouter upstream error (${lastRes?.status}): ${text}`,
    });
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

function truncate(s: string, n = 1200) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "(failed to read body)";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
