export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// SSE streaming endpoint that the homepage expects
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages, attachments = [] } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "messages[] required" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    // Force GPT-5 unless OPENROUTER_MODEL is explicitly set
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";
    const site = (process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app").replace(/\/+$/, "");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (event: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          // Send status event
          sendEvent({ type: "status", message: "Thinking..." });

          // Prepare messages with attachments
          let contextMessages = [...messages];

          // Add attachment content to the last user message if present
          if (attachments.length > 0) {
            const lastMessage = contextMessages[contextMessages.length - 1];
            if (lastMessage && lastMessage.role === "user") {
              let attachmentText = "";
              for (const att of attachments) {
                if (att.text) {
                  attachmentText += `\n\n--- ${att.name} ---\n${att.text}`;
                }
              }
              lastMessage.content += attachmentText;
            }
          }

          if (!apiKey) {
            // Mock streaming response
            const demo = "Mock reply: Set OPENROUTER_API_KEY to get real AI responses.";
            const words = demo.split(" ");
            for (const word of words) {
              sendEvent({ type: "token", text: word });
              await new Promise(r => setTimeout(r, 30));
            }
            
            sendEvent({ type: "usage", input: 100, output: words.length });
            sendEvent({ type: "done" });
            controller.close();
            return;
          }

          // Real OpenRouter streaming
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": site,
              "X-Title": "CareIQ"
            },
            body: JSON.stringify({
              model,
              messages: contextMessages,
              stream: true,
              temperature: 0.7,
              max_tokens: 2048
            })
          });

          if (!response.ok || !response.body) {
            sendEvent({ type: "error", message: `API error: ${response.status}` });
            sendEvent({ type: "done" });
            controller.close();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;

              try {
                const json = JSON.parse(payload);
                const token = json?.choices?.[0]?.delta?.content ?? "";
                if (token) {
                  sendEvent({ type: "token", text: token });
                }
              } catch {
                // ignore partial frames
              }
            }
          }

          sendEvent({ type: "done" });
          controller.close();
        } catch (err: any) {
          sendEvent({ type: "error", message: err?.message || "Unknown error" });
          sendEvent({ type: "done" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });

  } catch (err: any) {
    console.error("Complete API error:", err);
    return NextResponse.json({ 
      ok: false,
      error: err?.message || "Unexpected server error"
    }, { status: 500 });
  }
}
