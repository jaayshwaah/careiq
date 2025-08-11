export const runtime = "edge";

import { NextResponse } from "next/server";
import type { Message } from "@/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Minimal mock fallback so UX still works without a key/credits
function basicAIResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("hello") || lower.includes("hi")) return "Hey! How can I help today?";
  if (lower.includes("pbj"))
    return "PBJ (Payroll-Based Journal) reporting requires accurate staffing hours by job code…";
  if (lower.includes("email"))
    return "Here’s a clean draft you can tweak: \n\nSubject: Quick follow-up\n\nHi [Name],\n\n…";
  return `You said: "${prompt}". I'm a demo for now — add an API key/credits to get smarter responses.`;
}

function sanitizeEnv(val: string | undefined) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}
function originOf(siteUrl: string | undefined, fallback = "https://careiq.vercel.app") {
  const raw = sanitizeEnv(siteUrl) || fallback;
  try { return new URL(raw).origin; } catch { return raw.replace(/\/+$/, ""); }
}

export async function POST(req: Request) {
  const { chatId, message } = (await req.json()) as { chatId: string; message: Message };
  const title = message.content.split("\n")[0].slice(0, 40);

  const apiKey = sanitizeEnv(process.env.OPENROUTER_API_KEY);
  const model = sanitizeEnv(process.env.OPENROUTER_MODEL) || "openrouter/auto";
  const site = originOf(process.env.SITE_URL);

  // If no key, return mock
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
        Origin: site,
        Referer: site,
        "HTTP-Referer": site,
        "X-Title": "CareIQ",
      } as Record<string, string>,
      body: JSON.stringify(body),
    });

    // Non-200: provide actionable text; 401/402 → seamless mock fallback
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      const status = resp.status;

      // Build a helpful message for you (dev), but keep user experience smooth.
      let devHint = "Provider error.";
      if (status === 401) devHint = "Invalid/missing API key.";
      if (status === 402) devHint = "Insufficient credits on OpenRouter.";
      if (status === 403) devHint = "Origin forbidden — check OpenRouter Allowed Origins.";
      if (status === 404) devHint = "Model not found — check OPENROUTER_MODEL.";
      if (status === 429) devHint = "Rate limited.";
      if (status >= 500) devHint = "Provider is having an issue.";

      console.error("OpenRouter error", { status, body: text.slice(0, 400) });

      // If auth/credits issue, auto-fallback to mock so users still get a reply.
      if (status === 401 || status === 402) {
        const reply: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: basicAIResponse(message.content),
          createdAt: Date.now(),
        };
        // Add a dev flag so you can see what's happening in the network tab if needed
        return NextResponse.json({ ok: true, message: reply, title, devHint }, { status: 200 });
      }

      // Other errors: return a concise message to the user
      const reply: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I couldn’t reach the model just now. Please try again shortly.",
        createdAt: Date.now(),
      };
      return NextResponse.json({ ok: true, message: reply, title, devHint }, { status: 200 });
    }

    // Success
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
