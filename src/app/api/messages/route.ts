export const runtime = "edge";

import { NextResponse } from "next/server";
import type { Message } from "@/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Minimal mock fallback so UX still works without a key
function basicAIResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) return "Hey! How can I help today?";
  if (lower.includes("pbj"))
    return "PBJ (Payroll-Based Journal) reporting requires accurate staffing hours by job code…";
  if (lower.includes("email"))
    return "Here’s a clean draft you can tweak: \n\nSubject: Quick follow-up\n\nHi [Name],\n\n…";
  return `You said: "${prompt}". I'm a demo for now — add an API key to get smarter responses.`;
}

// Strip quotes and whitespace from env values (handles accidental pasting with quotes)
function sanitizeEnv(val: string | undefined) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}

// Normalize SITE_URL to a bare origin (no trailing slash/path)
function getOrigin(siteUrl: string | undefined, fallback = "https://careiq.vercel.app") {
  const raw = sanitizeEnv(siteUrl) || fallback;
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

export async function POST(req: Request) {
  const { chatId, message } = (await req.json()) as { chatId: string; message: Message };
  const title = message.content.split("\n")[0].slice(0, 40);

  const apiKey = sanitizeEnv(process.env.OPENROUTER_API_KEY);
  const model = sanitizeEnv(process.env.OPENROUTER_MODEL) || "openrouter/auto";
  const site = getOrigin(process.env.SITE_URL);

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
      stream: false,
      max_tokens: 600,
      temperature: 0.3,
    };

    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // These help with origin allowlists on OpenRouter keys
        Origin: site,
        Referer: site,
        "HTTP-Referer": site,
        "X-Title": "CareIQ",
      } as Record<string, string>,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      let msg = "Hmm, I couldn’t reach the model.";
      if (resp.status === 401) msg = "The API key looks invalid or missing on the server.";
      if (resp.status === 403) msg = "Access forbidden (check OpenRouter Allowed Origins).";
      if (resp.status === 404) msg = "Model not found (check OPENROUTER_MODEL).";
      if (resp.status === 429) msg = "Rate limit hit. Try again in a moment.";
      if (resp.status >= 500) msg = "Provider issue. Try again shortly.";

      // Log details for debugging in Vercel logs
      console.error("OpenRouter error", { status: resp.status, body: text.slice(0, 400) });
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: msg,
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
      content: "Network hiccup reaching the model. Please try again.",
      createdAt: Date.now(),
    };
    return NextResponse.json({ ok: true, message: reply, title }, { status: 200 });
  }
}
