import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Streams assistant text back to the client as plain text.
 * - Uses OpenRouter when OPENROUTER_API_KEY is present
 * - Falls back to a graceful mock that also streams
 */
export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Bad Request: messages array required", { status: 400 });
  }

  // If there is no key, stream a mock reply so the UI still shows typing
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    const last = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
    const mock =
      `Mock reply: I understood your message — “${last}”. ` +
      `Set OPENROUTER_API_KEY to get real AI responses.`;

    return streamFromText(mock);
  }

  const model =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct";

  // Call OpenRouter with streaming enabled and proxy the token deltas
  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "CareIQ",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => "");
    const msg = `Upstream error ${upstream.status}: ${errText || "unknown error"}`;
    return new Response(msg, { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      function push(text: string) {
        controller.enqueue(encoder.encode(text));
      }

      const read = async (): Promise<void> => {
        try {
          const { value, done } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          // OpenRouter (OpenAI-style) SSE lines: "data: {...}\n\n"
          const lines = buffer.split("\n");
          // keep the last partial line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const token =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content ??
                "";
              if (token) push(token);
            } catch {
              // ignore JSON parse errors on keep-alives
            }
          }

          await read();
        } catch (err) {
          try {
            controller.error(err);
          } catch {
            // ignore
          }
        }
      };

      read();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Stream a fixed string back to the client in small chunks (mock typing). */
function streamFromText(text: string) {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/); // keep spaces
  const readable = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w));
        // tiny delay for the typing feel; safe for serverless
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
