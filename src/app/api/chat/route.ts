export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

export async function POST(req: Request) {
  const { chatId, content } = await req.json();
  if (!chatId || !content) {
    return NextResponse.json({ ok: false, error: "chatId and content required" }, { status: 400 });
  }

  // Insert user message
  const { error: userErr } = await supabase
    .from("messages")
    .insert({ chat_id: chatId, role: "user", content });

  if (userErr) {
    return NextResponse.json({ ok: false, error: userErr.message }, { status: 500 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      async function saveAssistant(full: string) {
        await supabase.from("messages").insert({
          chat_id: chatId,
          role: "assistant",
          content: full,
        });
      }

      try {
        if (OPENROUTER_API_KEY) {
          // Build short history
          const { data: history } = await supabase
            .from("messages")
            .select("role,content")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true })
            .limit(30);

          const messages = (history || []).map((m) => ({ role: m.role, content: m.content }));

          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://careiq",     // optional metadata
              "X-Title": "CareIQ Chat"
            },
            body: JSON.stringify({
              model: "meta-llama/llama-3.1-8b-instruct",
              messages,
              stream: true
            })
          });

          if (!res.ok || !res.body) throw new Error(`OpenRouter ${res.status}`);

          const reader = res.body.getReader();
          let full = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = new TextDecoder().decode(value);
            controller.enqueue(encoder.encode(chunk));

            // accumulate for final save
            const lines = chunk.split("\n").filter(Boolean);
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6);
              if (json === "[DONE]") continue;
              try {
                const obj = JSON.parse(json);
                const delta = obj?.choices?.[0]?.delta?.content ?? "";
                if (delta) full += delta;
              } catch {}
            }
          }

          await saveAssistant(full);
          controller.close();
          return;
        } else {
          const parts = [
            "Streaming from local mock since OPENROUTER_API_KEY isn’t set ",
            "(or not available to this build env). ",
            "Your UI and DB wiring are good!"
          ];
          let full = "";
          for (const p of parts) {
            full += p;
            controller.enqueue(encoder.encode(p));
            await new Promise((r) => setTimeout(r, 120));
          }
          await saveAssistant(full);
          controller.close();
        }
      } catch (err: any) {
        const msg = `\n\n[Assistant error] ${err?.message || "Unknown error"}`;
        controller.enqueue(encoder.encode(msg));
        await saveAssistant(msg);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
