import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Optional OpenRouter streaming (falls back to mock if no key)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

export async function POST(req: Request) {
  const { chatId, content } = await req.json();
  if (!chatId || !content) {
    return NextResponse.json({ ok: false, error: "chatId and content required" }, { status: 400 });
  }

  // 1) Insert user message
  const { error: userErr } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, role: "user", content });

  if (userErr) {
    return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
  }

  // 2) Create streaming response (but we also persist to Supabase as we go)
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Helper to persist assistant chunks (simple append semantics)
      async function appendAssistant(text: string, isFinal = false) {
        // Upsert temp "streaming" row by storing entire accumulated content.
        // Simpler approach: insert new message for final only.
        if (isFinal) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            role: "assistant",
            content: text,
          });
        }
      }

      try {
        // If we have an OpenRouter key, stream from it; else mock stream
        if (OPENROUTER_API_KEY) {
          // Build prompt from recent messages
          const { data: history } = await supabase
            .from("messages")
            .select("role,content")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true })
            .limit(30);

          const messages = (history || []).map((m) => ({
            role: m.role,
            content: m.content,
          }));

          // Stream from OpenRouter (text event stream)
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: "meta-llama/llama-3.1-8b-instruct",
              messages,
              stream: true,
            }),
          });

          if (!res.ok || !res.body) {
            throw new Error(`OpenRouter error: ${res.status}`);
          }

          const reader = res.body.getReader();
          let full = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            // Forward raw stream to client as text (you can switch to SSE if you prefer)
            controller.enqueue(encoder.encode(chunk));

            // Parse minimal delta tokens for persistence (best-effort)
            const lines = chunk.split("\n").filter(Boolean);
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const json = line.slice(6);
                if (json === "[DONE]") continue;
                try {
                  const obj = JSON.parse(json);
                  const delta = obj?.choices?.[0]?.delta?.content ?? "";
                  if (delta) full += delta;
                } catch {
                  /* ignore parse errors */
                }
              }
            }
          }

          // Final insert of full assistant message
          await appendAssistant(full, true);
          controller.close();
          return;
        } else {
          // Mock streaming (no external key needed)
          const mock = [
            "Sure — I’ve connected your chats to Supabase.",
            " Messages now stream in with Apple-polished styling.",
            " You can switch conversations from the left sidebar anytime.",
          ];
          let full = "";
          for (const part of mock) {
            full += part;
            controller.enqueue(encoder.encode(part));
            await new Promise((r) => setTimeout(r, 120));
          }
          await appendAssistant(full, true);
          controller.close();
          return;
        }
      } catch (err: any) {
        const msg = `\n\n[Error] ${err?.message || "Something went wrong."}`;
        controller.enqueue(encoder.encode(msg));
        await appendAssistant(msg, true);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
