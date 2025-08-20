import { NextRequest, NextResponse } from "next/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function bad(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return bad(500, "Missing OPENROUTER_API_KEY");

  try {
    const body = await req.json().catch(() => ({}));
    const messages = (body.messages ?? []) as Array<{ role: string; content: string }>;
    const userText: string | undefined = body.message || messages.find((m: any) => m.role === "user")?.content;
    const facilityId: string | null = body.facilityId ?? null;
    const category: string | null = body.category ?? null;

    if (!userText) return bad(400, "No user message provided");

    // Build RAG context
    const ctx = await buildRagContext({
      query: userText,
      facilityId,
      category,
      topK: 6,
      accessToken: undefined, // pass a token here if you enforce RLS per-user
    });

    const system = [
      {
        role: "system",
        content: (
          [
            "You are CareIQ, an HR and operations assistant.",
            "Use the provided Context when relevant, and cite sources by their number like (1) (2).",
            "If the Context does not contain the answer, say so briefly and continue using your general knowledge.",
          ].join("\n")
        ),
      },
      ctx ? { role: "system", content: ctx } : undefined,
    ].filter(Boolean) as Array<{ role: "system"; content: string }>;

    const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct";

    const resp = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [...system, { role: "user", content: userText }],
        temperature: 0.3,
        provider: { allow_fallbacks: true },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return bad(500, `OpenRouter error ${resp.status}: ${text || "no body"}`);
    }

    const json = await resp.json();
    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.delta?.content ??
      "";

    return NextResponse.json({ ok: true, content, raw: json });
  } catch (err: any) {
    console.error(err);
    return bad(500, err.message || "Unknown error");
  }
}