// src/lib/modelRouter.ts
import OpenAI from "openai";

/**
 * Centralized model + client wiring.
 * - Primary chat model: ChatGPT-5 (via OpenRouter)
 * - Auto-title model: inexpensive LLM (override via env)
 *
 * ENV:
 *   OPENROUTER_API_KEY=...
 *   OPENROUTER_SITE_URL=https://careiq-eight.vercel.app   (optional)
 *   OPENROUTER_SITE_NAME=CareIQ                           (optional)
 *   OPENROUTER_MODEL=openai/gpt-5-chat                    (optional)
 *   OPENROUTER_TITLE_MODEL=meta-llama/llama-3.1-8b-instruct (optional)
 */

const SITE_URL = process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app";
const SITE_NAME = process.env.OPENROUTER_SITE_NAME || "CareIQ";
const API_KEY = (process.env.OPENROUTER_API_KEY || "").trim();

export const CHAT_MODEL =
  process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";

export const AUTO_TITLE_MODEL =
  process.env.OPENROUTER_TITLE_MODEL || "meta-llama/llama-3.1-8b-instruct";

export function getOpenRouterClient() {
  if (!API_KEY) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Get one at https://openrouter.ai/ and add it to your environment."
    );
  }
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: API_KEY,
    defaultHeaders: {
      "HTTP-Referer": SITE_URL,
      "X-Title": SITE_NAME,
    },
  });
}

export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

// Updated system prompt with cleaner formatting instructions
export const SYSTEM_PROMPT = [
  "You are CareIQ, an expert assistant for U.S. nursing home operations and compliance.",
  "Write in clear, professional prose without using asterisks, markdown formatting, or excessive punctuation.",
  "Use plain text with proper paragraphs. When listing items, use simple numbered lists or write them in sentence form.",
  "Be practical, accurate, and concise. Focus on actionable guidance.",
  "No legal disclaimers unless specifically asked.",
  "When citing regulations, use the format: '42 CFR 483.12 requires...' rather than markdown formatting."
].join(" ");