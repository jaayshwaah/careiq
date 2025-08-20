// src/app/api/chat-proxy/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { chatOnce, CHAT_MODEL } from "@/lib/modelRouter";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    const { messages, temperature, model } = (await req.json().catch(() => ({}))) as {
      messages?: Msg[];
      temperature?: number;
      model?: string; // optional override
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: false, error: "messages[] required" }, { status: 400 });
    }

    const out = await chatOnce({ messages, temperature, model });
    return NextResponse.json({ ok: true, ...out });
  } catch (e: any) {
    // Helpful hint if BYOK-only model is requested by mistake
    const msg = e?.message || "";
    const hint =
      /requires a key|BYOK|forbidden/i.test(msg)
        ? "This model may require BYOK. Use 'openai/gpt-5-chat' or link your OpenAI key in OpenRouter Integrations."
        : undefined;

    return NextResponse.json(
      { ok: false, error: msg, hint, defaultModel: CHAT_MODEL },
      { status: 500 }
    );
  }
}

// Optional GET ping
export async function GET() {
  return NextResponse.json({ ok: true, model: CHAT_MODEL });
}
