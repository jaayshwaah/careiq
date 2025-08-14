import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Attachment = { name: string; type: string; size: number; text: string };

export async function POST(req: NextRequest) {
  const { messages, attachments = [] } = (await req.json()) as {
    messages: Msg[];
    attachments?: Attachment[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Bad Request: messages array required", { status: 400 });
  }

  // Build an instruction to include attachment excerpts if present.
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

  const upstreamMessages: Msg[] =
    systemPrefix
      ? [{ role: "system", content: systemPrefix }, ...messages]
      : messages;

  // If there is no key, stream a mock reply so the UI still shows typing
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) {
    const last = upstreamMessages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
    const mock =
      `Mock reply (no API key set). I read ${attachments.length} attachment(s). ` +
      (attachments.length ? "I’ll focus on them. " : "") +
      `You said: “${last}”.`;
    return streamFromText(mock);
  }

  const model =
    process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct";

  // Call OpenRouter with streaming enabled and proxy token deltas -> plain text
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
      messages: upstreamMessages,
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
          const lines = buffer.split("\n");
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
              // ignore parse errors on keep-alives
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
  const words = text.split(/(\s+)/);
  const readable = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(w));
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
