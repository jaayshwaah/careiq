export const runtime = "edge";

import { NextResponse } from "next/server";
import type { Message } from "@/types";

// Simple mock fallback so the app still works if no API key is set
function basicAIResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) return "Hey! How can I help today?";
  if (lower.includes("pbj"))
    return "PBJ (Payroll-Based Journal) reporting requires accurate staffing hours by job code…";
  if (lower.includes("email"))
    return "Here’s a clean draft you can tweak: \n\nSubject: Quick follow-up\n\nHi [Name],\n\n…";
  return `You said: "${prompt}". I'm a demo for now — add an API key to get smarter responses.`;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  const { chatId, message } = (await req.json()) as { chatId: string; message: Message };
  const title = message.content.split("\n")[0].slice(0, 40);

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct";

  // If no key is configured, use the mock reply so UX still works
  if (!apiKey) {
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: basicAIResponse(message.content),
      createdAt: Date.now(),
    };
    return NextResponse.json({ ok: true, message: reply, title });
  }

  try {
    // Minimal system prompt — tweak to taste
    const system = [
      "You are CareIQ, a crisp, helpful assistant for nursing homes.",
      "Keep replies concise unless the user asks for detail.",
      "Avoid purple prose. Prefer clear steps, examples, and checklists.",
    ].join(" ");

    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: message.content },
      ],
      // You can turn on streaming later; starting with simple non-stream for reliability
      stream: false,
      max_tokens: 600,
      temperature: 0.3,
    };

    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // These two help OpenRouter attribute traffic to your app (optional but recommended)
        "HTTP-Referer": process.env.SITE_URL ?? "https://careiq.vercel.app",
        "X-Title": "CareIQ",
      } as Record<string, string>,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenRouter error:", resp.status, text);
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Hmm, I couldn't reach the model just now. Try again in a moment.",
        createdAt: Date.now(),
      };
      return NextResponse.json({ ok: true, message: reply, title }, { status: 200 });
    }

    const data = await resp.json();
    const content: string =
      data?.choices?.[0]?.message?.content ?? "Sorry, I couldn’t generate a reply just now.";

    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      createdAt: Date.now(),
    };

    return NextResponse.json({ ok: true, message: reply, title });
  } catch (err) {
    console.error("LLM request exception:", err);
    const reply: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Something went wrong reaching the model. Please try again.",
      createdAt: Date.now(),
    };
    return NextResponse.json({ ok: true, message: reply, title }, { status: 200 });
  }
}
