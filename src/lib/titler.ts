// src/lib/titler.ts - resilient, cheap auto-titling
import { scrubPHI } from "@/lib/privacy/scrub";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TITLE_MODELS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku",
  "google/gemini-flash-1.5",
] as const;

export type TitlerInput = {
  userText: string;
  assistantText: string;
  targetLang?: string;
  timeoutMs?: number;
};

function collapseLongCode(s: string): string {
  // Collapse fenced code blocks longer than ~200 chars
  return s.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.slice(3, -3);
    if (inner.length > 200) return "(code omitted)";
    return block;
  });
}

function stripPII(s: string): string {
  const { cleaned } = scrubPHI(s);
  // basic emails/phones again (non-PHI contexts)
  return cleaned
    .replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "account")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "phone");
}

function prep(text: string): string {
  let t = String(text || "").slice(0, 2000);
  t = collapseLongCode(t);
  t = stripPII(t);
  return t.trim();
}

export async function generateTitle({ userText, assistantText, targetLang, timeoutMs = 2000 }: TitlerInput) {
  const system = `You generate concise conversation titles.

Requirements:
- 4 to 8 words. No quotes. No emojis. No trailing punctuation.
- Capture the main task or topic, not a generic “Chat with AI”.
- Use the user's language detected from the messages; if unclear, use English.
- Remove any personal identifiers (names, emails, phone numbers).
- Prefer noun phrases or imperatives.
- If content is only greetings or too vague, output: "New Chat".`;

  const bodyBase = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: `User:\n${prep(userText)}\n\nAssistant:\n${prep(assistantText)}` },
    ],
    temperature: 0.1,
    max_tokens: 24,
    provider: { allow_fallbacks: true },
  } as any;

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), timeoutMs);

  for (const model of TITLE_MODELS) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, ...bodyBase }),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const raw = (json?.choices?.[0]?.message?.content || "").trim();
      const title = sanitizeTitle(raw);
      clearTimeout(to);
      if (title) return title;
    } catch (e) {
      // next
    }
  }
  clearTimeout(to);
  return "New Chat";
}

export function sanitizeTitle(input: string) {
  let s = String(input || "");
  s = s.split("\n")[0].trim();
  s = s.replace(/^(["'`“”]+)|(["'`“”]+)$/g, "");
  s = s.replace(/[.!?…]+$/g, "");
  if (s.length > 65) s = s.slice(0, 65).trim();
  // cheap pii
  s = s.replace(/\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "account");
  s = s.replace(/\+?\d[\d\s().-]{7,}\d/g, "phone");
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 3) return "";
  return s;
}

