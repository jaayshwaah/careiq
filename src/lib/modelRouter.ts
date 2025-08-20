// src/lib/modelRouter.ts
import OpenAI from "openai";

const SITE_URL = process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app";
const SITE_NAME = process.env.OPENROUTER_SITE_NAME || "CareIQ";
const API_KEY = (process.env.OPENROUTER_API_KEY || "").trim();

export const AUTO_TITLE_MODEL =
  process.env.OPENROUTER_TITLE_MODEL || "meta-llama/llama-3.1-8b-instruct";

// Main chat model: fixed to GPT-5 Chat unless overridden by env
export const CHAT_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";

export function getOpenRouterClient() {
  if (!API_KEY) throw new Error("Missing OPENROUTER_API_KEY");
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: API_KEY,
    defaultHeaders: {
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
    },
  });
}

/** Single-model chat (GPT-5 Chat by default). */
export async function chatOnce(opts: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  model?: string; // optional override per-request
}) {
  const client = getOpenRouterClient();
  const { messages, temperature = 0.5 } = opts;
  const model = (opts.model && opts.model.trim()) || CHAT_MODEL;

  const r = await client.chat.completions.create({
    model, // e.g., "openai/gpt-5-chat"
    temperature,
    messages,
  });

  const content = r.choices?.[0]?.message?.content ?? "";
  return { modelUsed: model, content };
}
