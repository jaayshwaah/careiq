import { NextResponse } from "next/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

export const runtime = "nodejs";
// Ensure this runs dynamically
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function bad(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return bad(500, "Missing OPENROUTER_API_KEY");

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return bad(400, "Invalid JSON body");
  }

  // Expected: { messages: [...], model?: string, useRag?: boolean, facilityId?: string, category?: string }
  const {
    messages,
    model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
    useRag = true,
    facilityId = null,
    category = null,
  } = payload || {};

  if (!Array.isArray(messages) || !messages.length) {
    return bad(400, "messages[] required");
  }

  // Try to derive a query from the latest user message
  const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
  const queryText = lastUser?.content || "";

  // Grab bearer token if you authenticate users and want RLS respected
  const authHeader = req.headers.get("authorization") || undefined;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  // Build optional RAG context
  let systemWithContext: any | null = null;
  if (useRag) {
    const ctx = await buildRagContext({
      query: queryText,
      facilityId,
      category,
      topK: 6,
      accessToken,
    });
    if (ctx) {
      systemWithContext = {
        role: "system",
        content:
          `You are CareIQ, an assistant for skilled nursing facilities. Use the provided context when relevant and cite it like (1), (2), etc.\n\n${ctx}`,
      };
    }
  }

  const finalMessages = systemWithContext
    ? [systemWithContext, ...messages]
    : messages;

  // Proxy a streaming request to OpenRouter
  const upstream = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ",
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return bad(500, `OpenRouter error ${upstream.status}: ${text || "no body"}`);
  }

  // Pipe SSE straight through
  const stream = new ReadableStream({
    start(controller) {
      const reader = upstream.body!.getReader();

      const pump = async (): Promise<void> => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
          await pump();
        } catch (err) {
          try {
            const encoded = new TextEncoder().encode(
              `event: error\ndata: ${JSON.stringify({ message: (err as any)?.message || "stream error" })}\n\n`
            );
            controller.enqueue(encoded);
          } finally {
            controller.close();
          }
        }
      };

      pump();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Allow the browser to receive events as they arrive
      "Transfer-Encoding": "chunked",
    } as any,
  });
}
