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
    const { chatId, content } = (await req.json()) as { chatId: string; content: string };

    if (!chatId || !content || !content.trim()) {
      return NextResponse.json({ ok: false, error: "Missing chatId or content" }, { status: 400 });
    }

    const supabase = createClientServer();

    // 1) Persist the user message immediately
    const { data: userInsert, error: userErr } = await supabase
      .from("messages")
      .insert({ chat_id: chatId, role: "user", content })
      .select("*")
      .single<DBMsg>();

    if (userErr) {
      return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
    }

    // 2) Fetch prior context (limit to last N)
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

    // 3) OpenRouter streaming call
    const apiKey = sanitize(process.env.OPENROUTER_API_KEY);
    const model = sanitize(process.env.OPENROUTER_MODEL) || "openrouter/auto"; // you can set a smarter model via env
    const site = originOf(process.env.SITE_URL, "https://careiq-eight.vercel.app");

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Missing OPENROUTER_API_KEY" }, { status: 500 });
    }

    const upstreamAbort = new AbortController();
    // Forward client abort (e.g., user pressed Stop) to upstream
    try {
      // @ts-ignore - Edge Request has a signal
      req.signal?.addEventListener?.("abort", () => upstreamAbort.abort());
    } catch {}

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": site,
        "X-Title": "CareIQ",
      } as Record<string, string>,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.3,
        max_tokens: 800,
      }),
      signal: upstreamAbort.signal,
    });

    if (!upstream.ok || !upstream.body) {
      const body = await upstream.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `Upstream error ${upstream.status}`, body }, { status: 502 });
    }

    const reader = upstream.body.getReader();
    const textDecoder = new TextDecoder();

    let assistantFull = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          // On normal completion, persist final assistant message
          if (assistantFull.trim().length) {
            try {
              await supabase
                .from("messages")
                .insert({ chat_id: chatId, role: "assistant", content: assistantFull })
                .select("*")
                .single();
            } catch {}
          }
          controller.close();
          return;
        }

        // Pass chunks through to client
        controller.enqueue(value);

        // Parse SSE lines to accumulate content for persistence/stop
        const chunk = textDecoder.decode(value);
        for (const line of chunk.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            const delta = obj?.choices?.[0]?.delta ?? obj?.choices?.[0]?.message ?? {};
            const token: string | undefined = delta?.content;
            if (token) assistantFull += token;
          } catch {
            // ignore parse errors on partial frames
          }
        }
      },
      async cancel() {
        // Client aborted (Stop pressed) — persist whatever we have so far
        try {
          upstreamAbort.abort();
        } catch {}
        if (assistantFull.trim().length) {
          try {
            await supabase
              .from("messages")
              .insert({ chat_id: chatId, role: "assistant", content: assistantFull })
              .select("*")
              .single();
          } catch {}
        }
      },
    });

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
