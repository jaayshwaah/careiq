// src/lib/openrouter.ts
export type ORMessage = { role: "system" | "user" | "assistant"; content: string };

export const OPENROUTER_URL = "https://openrouter.ai/api/v1";

function mask(key?: string | null) {
  if (!key) return "";
  const show = 6;
  return key.length <= show ? "********" : `${"*".repeat(key.length - show)}${key.slice(-show)}`;
}

export function getORConfig() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is missing at runtime. Add it in Vercel → Project → Settings → Environment Variables and redeploy."
    );
  }
  return {
    key,
    siteUrl: process.env.OPENROUTER_SITE_URL || "https://example.com",
    siteName: process.env.OPENROUTER_SITE_NAME || "CareIQ",
    chatModel: process.env.OPENROUTER_MODEL || "openai/gpt-5-chat",
    titleModel: process.env.OPENROUTER_TITLE_MODEL || "meta-llama/llama-3.1-8b-instruct",
    masked: mask(key),
  };
}

export async function orChatComplete(messages: ORMessage[], model?: string, stream = false) {
  const cfg = getORConfig();
  const res = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": cfg.siteUrl,
      "X-Title": cfg.siteName,
    },
    body: JSON.stringify({
      model: model || cfg.chatModel,
      messages,
      stream,
    }),
  });
  return res;
}
