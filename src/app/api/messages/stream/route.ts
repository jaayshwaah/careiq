export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

function sanitize(val?: string) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}
function originOf(url?: string, fallback = "https://careiq-eight.vercel.app") {
  const raw = sanitize(url) || fallback;
  try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ""); }
}

type DBMsg = { id: string; chat_id: string; role: "user" | "assistant"; content: string; created_at: string };

export async function POST(req: Request) {
  try {
    const { chatId, content } = await req.json();
    if (!chatId || !content || String(content).trim().length === 0) {
      return NextResponse.json({ ok: false, error: "chatId and content required" }, { status: 400 });
    }

    // 1) Save the user message
    const supabase = createClientServer();
    const { data: userSaved, error: userErr } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, role: "user", content })
      .select("*")
      .single<DBMsg>();
    if (userErr) {
      return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
    }

    // 2) Load prior messages (for context)
    const { data: prior, error: priorErr } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (priorErr) {
      return NextResponse.json({ ok: false, error: priorErr.message }, { status: 500 });
    }

    const messages = (prior || []).map((m) => ({ role: m.role, content: m.content }));

    // 3) OpenRouter streaming call (with mock fallback)
    const apiKey = sanitize(process.env.OPENROUTER_API_KEY);
    const model = sanitize(process.env.OPENROUTER_MODEL) || "openrouter/auto"; // you can set a smarter model via env
    const site = originOf(process.env.SITE_URL, "https://careiq-eight.vercel.app");

    // If no API key, fall back to a local mock stream so you can test end-to-end without credits.
    if (!apiKey) {
      const mockText =
        "👋 Mock mode: OPENROUTER_API_KEY is not set, so this is a local demo reply.\n\n" +
        "You said: " + JSON.stringify(content) + "\n\n" +
        "Next steps to enable real responses:\n" +
        "1) Add an OpenRouter API key in your Vercel/Supabase env.\n" +
        "2) Set OPENROUTER_MODEL (e.g., \"meta-llama/llama-3.1-8b-instruct\").";
      const encoder = new TextEncoder();
      const words = mockText.split(/(\s+)/);
      let assistantFull = "";
      const stream = new ReadableStream({
        async start(controller) {
          for (const w of words) {
            assistantFull += w;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: w })}\n\n`));
            await new Promise((r) => setTimeout(r, 20));
          }
          // Persist final assistant message
          try {
            await supabase
              .from("messages")
              .insert({ chat_id: chatId, role: "assistant", content: assistantFull });
          } catch {}
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
        cancel() {},
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Real streaming via OpenRouter
    const upstreamAbort = new AbortController();

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: upstreamAbort.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": site,
        "X-Title": "CareIQ",
      } as Record<string, string>,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ ok: false, error: `Model call failed (${upstream.status})` }, { status: 502 });
    }

    const encoder = new TextEncoder();
    let assistantFull = "";
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstream.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value, { stream: true });
            buffer += chunk;

            // SSE frames split by double newline
            const frames = buffer.split("\n\n");
            buffer = frames.pop() || "";

            for (const frame of frames) {
              if (!frame.startsWith("data:")) continue;
              const payload = frame.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const obj = JSON.parse(payload);
                const delta = obj?.choices?.[0]?.delta ?? obj?.choices?.[0]?.message ?? {};
                const token: string | undefined = delta?.content;
                if (token) {
                  assistantFull += token;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: token })}\n\n`));
                }
              } catch {
                // ignore parse errors on partial frames
              }
            }
          }
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
      async cancel() {
        // Client aborted (Stop pressed) — persist whatever we have so far
        try {
          upstreamAbort.abort();
        } catch {}
      },
    });

    // Persist the final assistant message after the stream ends
    stream.pipeTo(new WritableStream({
      write() {},
      close: async () => {
        if (assistantFull.trim().length > 0) {
          try {
            await supabase
              .from("messages")
              .insert({ chat_id: chatId, role: "assistant", content: assistantFull });
          } catch {}
        }
      },
      abort() {},
    })).catch(() => {});

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
