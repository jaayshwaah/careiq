import { NextResponse } from "next/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function bad(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return bad(500, "Missing OPENROUTER_API_KEY");

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return bad(400, "Invalid JSON body");
  }

  const {
    messages,
    model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
    useRag = true,
    facilityId = null,
    category = null,
  } = payload || {};

  if (!Array.isArray(messages) || !messages.length) {
    return bad(400, "messages[] required");
  }

  const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
  const queryText = lastUser?.content || "";

  const authHeader = req.headers.get("authorization") || undefined;
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  let systemWithContext: any | null = null;
  if (useRag) {
    const ctx = await buildRagContext({
      query: queryText,
      facilityId,
      category,
      topK: 6,
      accessToken,
    });
    if (ctx) {
      systemWithContext = {
        role: "system",
        content:
          `You are CareIQ, an assistant for skilled nursing facilities. Use the provided context when relevant and cite it like (1), (2), etc.\n\n${ctx}`,
      };
    }
  }

  const finalMessages = systemWithContext
    ? [systemWithContext, ...messages]
    : messages;

  const resp = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ",
    },
    body: JSON.stringify({
      model,
      messages: finalMessages,
      stream: false,
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
}
