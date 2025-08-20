// src/lib/ai/providers.ts
type Msg = { role: "system" | "user" | "assistant"; content: string };

export interface ChatProvider {
  name: string;
  complete(messages: Msg[], opts?: { temperature?: number; max_tokens?: number }): Promise<string>;
}

export function providerFromEnv(): ChatProvider {
  const hipaa = process.env.HIPAA_MODE === "true";
  const p = (process.env.AI_PROVIDER || "").toLowerCase();

  if (p === "azure-openai") return azureOpenAI();
  if (p === "local") return localEcho();

  if (hipaa) {
    throw new Error("HIPAA_MODE is true but AI_PROVIDER is not a HIPAA-eligible provider.");
  }
  // Non-HIPAA mode fallback (still avoid OpenRouter for PHI)
  return localEcho();
}

function localEcho(): ChatProvider {
  return {
    name: "local-echo",
    async complete(messages) {
      const last = messages.slice().reverse().find(m => m.role === "user")?.content ?? "";
      return `Echo: ${last}`;
    }
  };
}

// Azure OpenAI (REST, no extra deps)
function azureOpenAI(): ChatProvider {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT!; // the model deployment name

  return {
    name: "azure-openai",
    async complete(messages, { temperature = 0.2, max_tokens = 1200 } = {}) {
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ messages, temperature, max_tokens }),
      });
      if (!res.ok) throw new Error(`Azure OpenAI error ${res.status}`);
      const j = await res.json();
      const text: string =
        j?.choices?.[0]?.message?.content ??
        j?.choices?.[0]?.delta?.content ??
        "";
      return text;
    },
  };
}
