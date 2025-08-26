// src/lib/ai.ts
"use client";

/**
 * Browser-side helper to call our server chat route.
 * Never call OpenRouter directly from the browser.
 */

export type UIMsg = { role: "system" | "user" | "assistant"; content: string };

export async function chatComplete(messages: UIMsg[], model?: string): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, model }),
  });

  // If server mapped an OpenRouter error, surface it nicely
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg =
      data?.error ||
      data?.message ||
      "Chat failed. Check /api/debug/openrouter and your Vercel env vars.";
    throw new Error(msg);
  }

  // OpenRouter (OpenAI-compatible) shape
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.delta?.content ??
    "";

  return typeof content === "string" ? content : JSON.stringify(content);
}
