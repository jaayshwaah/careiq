export const runtime = "edge";

import { NextResponse } from "next/server";

function sanitize(val?: string) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}
function originOf(url?: string, fallback = "https://careiq.vercel.app") {
  const raw = sanitize(url) || fallback;
  try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ""); }
}

export async function POST(req: Request) {
  const { message } = await req.json() as {
    chatId: string;
    message: { id: string; role: "user"; content: string; createdAt: number };
  };

  const apiKey = sanitize(process.env.OPENROUTER_API_KEY);
  const model = sanitize(process.env.OPENROUTER_MODEL) || "openrouter/auto";
  const site  = originOf(process.env.SITE_URL);

  // If no key, stream a tiny mock response so UX remains smooth.
  if (!apiKey) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        send({ choices: [{ delta: { content: "Demo mode: " } }] });
        send({ choices: [{ delta: { content: `You said “${message.content}”.` } }] });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      }
    });
  }

  // Call OpenRouter with streaming enabled (OpenAI-compatible SSE)
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Origin: site,
      Referer: site,
      "X-Title": "CareIQ",
    } as Record<string, string>,
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.3,
      max_tokens: 600,
      messages: [
        { role: "system", content: "You are CareIQ, a crisp, helpful assistant for nursing homes. Keep replies concise unless asked for detail. Avoid purple prose; prefer clear steps, examples, and checklists." },
        { role: "user", content: message.content }
      ],
    }),
  });

  // If provider errors, convert to a small SSE error stream instead of 4xx to keep client logic simple
  if (!resp.ok || !resp.body) {
    const encoder = new TextEncoder();
    const text = await resp.text().catch(() => "");
    const status = resp.status || 520;
    const hint =
      status === 401 ? "Invalid/missing API key" :
      status === 402 ? "Insufficient credits" :
      status === 403 ? "Origin forbidden (check key’s Allowed Origins)" :
      status === 404 ? "Model not found" :
      status === 429 ? "Rate limited" :
      "Provider error";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: { status, hint, body: text.slice(0,400) } })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      }
    });
  }

  // Pipe provider SSE straight through
  return new Response(resp.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    }
  });
}
