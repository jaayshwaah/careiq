type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

// Default to GPT-5 Chat; allow override via env
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || "openai/gpt-5-chat";

// Server-side completion helper
export async function complete(messages: Msg[]): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

  // Graceful fallback so the UI never shows just a timestamp
  if (!key) {
    const last = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
    if (!last) return "Hi! I’m here. Ask me anything about HR, onboarding, payroll, or scheduling.";
    return `Mock reply: I understood your message — “${last}”. Set OPENROUTER_API_KEY to get real AI responses.`;
  }

  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": (process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app").replace(/\/+$/, ""),
        "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 1200,
      }),
    });

    if (!r.ok) {
      const err = await r.text().catch(() => "");
      const last = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
      return `I couldn’t reach the model (${r.status}). ${err || ""}\n\nBut I’m still here — you said: “${last}”.`;
    }

    const data = await r.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text ?? "The model returned no content.";
  } catch {
    const last = messages.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
    return `There was a network error talking to the model. Still with you — “${last}”.`;
  }
}
