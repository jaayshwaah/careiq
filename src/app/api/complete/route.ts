import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Attachment = { name: string; type: string; size: number; text: string };

// Helper: write one SSE event line
function sseLine(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/**
 * Streams JSON events:
 *  - {type:"status", message:"thinking"}
 *  - {type:"token", text:"..."}  // partial content chunks
 *  - {type:"usage", input: n, output: n} // if available
 *  - {type:"error", message:"..."}
 *  - {type:"done"}
 */
export async function POST(req: NextRequest) {
  const { messages, attachments = [] } = (await req.json()) as {
    messages: Msg[];
    attachments?: Attachment[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(sseLine({ type: "error", message: "messages array required" }) + sseLine({ type: "done" }), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Build a system instruction that includes attachment excerpts, if any
  const attText = Array.isArray(attachments)
    ? attachments
        .map((a, i) => {
          const snippet = (a.text || "").slice(0, 30_000); // clamp each
          return `# Attachment ${i + 1}: ${a.name}\n${snippet}`;
        })
        .join("\n\n")
    : "";

  const systemPrefix =
    attachments.length > 0
      ? `You are given ${attachments.length} attachment(s). Use only the information in the attachments and the conversation to answer. If something is not in the attachments or message, say you don't know.\n\n${attText}`
      : "";

  const upstreamMessages: Msg[] = systemPrefix ? [{ role: "system", content: systemPrefix }, ...messages] : messages;

  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct";

  // Create an SSE stream to the client
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Emit initial status
      controller.enqueue(encoder.encode(sseLine({ type: "status", message: "thinking" })));

      // If no key, stream a mock response as SSE tokens
      if (!key) {
        const last = upstreamMessages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
        const mock =
          `Mock reply (no API key set). I read ${attachments.length} attachment(s). ` +
          (attachments.length ? "I’ll focus on them. " : "") +
          `You said: “${last}”.`;

        // Tokenize on small chunks to simulate typing
        const words = mock.split(/(\s+)/);
        for (const w of words) {
          controller.enqueue(encoder.encode(sseLine({ type: "token", text: w })));
          await new Promise((r) => setTimeout(r, 12));
        }
        controller.enqueue(encoder.encode(sseLine({ type: "done" })));
        controller.close();
        return;
      }

      // Call OpenRouter with streaming; proxy as SSE JSON events
      let upstream: Response | null = null;
      try {
        upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "CareIQ",
          },
          body: JSON.stringify({
            model,
            messages: upstreamMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });
      } catch (e: any) {
        controller.enqueue(encoder.encode(sseLine({ type: "error", message: "Network error reaching OpenRouter" })));
        controller.enqueue(encoder.encode(sseLine({ type: "done" })));
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        const errText = upstream ? await upstream.text().catch(() => "") : "";
        controller.enqueue(
          encoder.encode(
            sseLine({ type: "error", message: `Upstream error ${upstream?.status ?? 500}: ${errText || "unknown"}` })
          )
        );
        controller.enqueue(encoder.encode(sseLine({ type: "done" })));
        controller.close();
        return;
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const flushUsage = (usage?: any) => {
        // If upstream provided usage totals, forward them
        if (!usage) return;
        const input = usage.prompt_tokens ?? usage.input_tokens ?? undefined;
        const output = usage.completion_tokens ?? usage.output_tokens ?? undefined;
        if (input || output) {
          controller.enqueue(encoder.encode(sseLine({ type: "usage", input, output })));
        }
      };

      // Pump upstream SSE -> our SSE JSON frames
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // OpenRouter emits "data: {...}\n\n" SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();

          if (data === "[DONE]") {
            controller.enqueue(encoder.encode(sseLine({ type: "done" })));
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta ?? {};
            const token = delta?.content ?? "";

            // Stream partial token if present
            if (token) controller.enqueue(encoder.encode(sseLine({ type: "token", text: token })));

            // If usage appears in-stream or at end, forward it
            if (json?.usage) flushUsage(json.usage);
          } catch {
            // ignore JSON parse errors on keep-alives
          }
        }
      }

      // If the upstream closed without sending [DONE], finish our stream
      controller.enqueue(encoder.encode(sseLine({ type: "done" })));
      controller.close();
    },
    cancel() {
      // no-op
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
