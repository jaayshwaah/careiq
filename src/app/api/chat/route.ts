// src/app/api/chat/route.ts
import { NextRequest } from "next/server";

export const runtime = "edge";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  try {
    const { messages = [], attachments = [] } = await req.json();

    // Inject our cleaned system prompt (no asterisks, no inline citations)
    const systemPrompt =
      "You are CareIQ, an expert assistant for U.S. nursing home compliance and operations. Provide clear, survey‑ready answers with citations to source documents and effective dates when relevant. Call out state-specific variations where they matter. Keep responses concise and practical.";

    const chat: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(messages) ? messages : []),
    ];

    // Stream from OpenAI Chat Completions
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-chat",
        stream: true,
        temperature: 0.2,
        messages: chat,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(text || "Upstream error", { status: 502 });
    }

    // Re‑wrap OpenAI stream as SSE for the client
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const reader = upstream.body!.getReader();

        (async function pump() {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        })();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    return new Response(err?.message ?? "Internal error", { status: 500 });
  }
}
