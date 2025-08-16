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
    const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";
    const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Create SSE stream
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
            const mockText = "Mock response: I received your message and attachments. Set OPENROUTER_API_KEY to get real AI responses.";
            const words = mockText.split(/(\s+)/);
            
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
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              
              const data = trimmed.slice(5).trim();
              if (data === "[DONE]") continue;
              if (!data) continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  sendEvent({ type: "token", text: delta });
                }
                
                // Handle usage info if present
                if (parsed?.usage) {
                  sendEvent({ 
                    type: "usage", 
                    input: parsed.usage.prompt_tokens,
                    output: parsed.usage.completion_tokens 
                  });
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }

          sendEvent({ type: "done" });
          controller.close();

        } catch (error: any) {
          sendEvent({ 
            type: "error", 
            message: error?.message || "Streaming failed" 
          });
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
      error: err?.message || "Unknown error" 
    }, { status: 500 });
  }
}