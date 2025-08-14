type Role = "system" | "user" | "assistant";
type Msg = { role: Role; content: string };

// Default to 70B Instruct; allow override via env
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct";

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
    // Prefer OpenRouter (OpenAI-compatible schema)
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "CareIQ",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        stream: false,
        // Reasonable defaults; adjust as you like
        temperature: 0.7,
        max_tokens: 1024,
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
    return `There was a network error talking to the model. I still got your message: “${last}”.`;
  }
}
