import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Msg = { role: "system" | "user" | "assistant"; content: string };
type Attachment = { name: string; type: string; size: number; text: string };

function sseLine(obj: unknown) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

async function retrieveChunks(query: string, limit = 6) {
  // Simple, free retrieval using Postgres full-text search
  // Uses the expression index we created for speed.
  const { data, error } = await supabaseAdmin
    .from("chunks")
    .select("id, document_id, idx, content")
    .textSearch("content", query, { type: "websearch", config: "english" })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * SSE events:
 *  - {type:"status", message:"thinking"}
 *  - {type:"step", message:"retrieving", count:n}
 *  - {type:"citation", items:[{document_id,idx,preview}]}
 *  - {type:"token", text:"..."}
 *  - {type:"usage", input:n, output:n} (if upstream provides)
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

  // Build a system preface with attachments (from one-off uploads)
  const attText = Array.isArray(attachments)
    ? attachments
        .map((a, i) => `# Attachment ${i + 1}: ${a.name}\n${(a.text || "").slice(0, 30_000)}`)
        .join("\n\n")
    : "";

  // Retrieve persistent KB chunks using the user's latest question
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  let retrieved: Array<{ document_id: string; idx: number; content: string }> = [];
  try {
    if (lastUser.trim()) {
      retrieved = await retrieveChunks(lastUser, 6);
    }
  } catch (e) {
    // non-fatal; we'll just skip retrieval if DB is down
  }

  const retrievedText = retrieved
    .map((c, i) => `# KB ${i + 1} (doc ${c.document_id} · #${c.idx})\n${c.content.slice(0, 2000)}`)
    .join("\n\n");

  // Build the final system prefix
  const systemParts = [];
  if (attachments.length) {
    systemParts.push(
      `You are given ${attachments.length} attachment(s). Prefer using them when answering.\n\n${attText}`
    );
  }
  if (retrieved.length) {
    systemParts.push(
      `You also have ${retrieved.length} knowledge base chunk(s) retrieved by search. Use them if relevant.\n\n${retrievedText}`
    );
  }
  if (!systemParts.length) {
    systemParts.push(`Answer helpfully and concisely. If you don't know, say so.`);
  }
  const systemPrefix = systemParts.join("\n\n");

  const upstreamMessages: Msg[] = [{ role: "system", content: systemPrefix }, ...messages];

  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct";

  // SSE stream to client
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const push = (o: unknown) => controller.enqueue(enc.encode(sseLine(o)));

      push({ type: "status", message: "thinking" });

      // Send retrieval signals so you can render them later
      if (retrieved.length) {
        push({ type: "step", message: "retrieving", count: retrieved.length });
        push({
          type: "citation",
          items: retrieved.map((r) => ({
            document_id: r.document_id,
            idx: r.idx,
            preview: r.content.slice(0, 140),
          })),
        });
      }

      // If no key, stream a mock response
      if (!key) {
        const last = lastUser;
        const mock =
          `Mock reply (no API key set). KB chunks: ${retrieved.length}. ` +
          (retrieved.length ? "I’ll use those if relevant. " : "") +
          `You said: “${last}”.`;
        for (const w of mock.split(/(\s+)/)) {
          push({ type: "token", text: w });
          await new Promise((r) => setTimeout(r, 12));
        }
        push({ type: "done" });
        controller.close();
        return;
      }

      // Call OpenRouter and proxy as SSE JSON
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
      } catch {
        push({ type: "error", message: "Network error reaching OpenRouter" });
        push({ type: "done" });
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        const errText = upstream ? await upstream.text().catch(() => "") : "";
        push({ type: "error", message: `Upstream error ${upstream?.status ?? 500}: ${errText || "unknown"}` });
        push({ type: "done" });
        controller.close();
        return;
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const sendUsage = (usage?: any) => {
        if (!usage) return;
        const input = usage.prompt_tokens ?? usage.input_tokens ?? undefined;
        const output = usage.completion_tokens ?? usage.output_tokens ?? undefined;
        if (input || output) push({ type: "usage", input, output });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") {
            push({ type: "done" });
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const token = json?.choices?.[0]?.delta?.content ?? "";
            if (token) push({ type: "token", text: token });
            if (json?.usage) sendUsage(json.usage);
          } catch {
            // ignore keep-alives
          }
        }
      }

      push({ type: "done" });
      controller.close();
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
