// src/app/api/chat/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function assertEnv() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is missing. Add it in Vercel → Project → Settings → Environment Variables and redeploy."
    );
  }
  return {
    key,
    siteUrl: process.env.OPENROUTER_SITE_URL || "",
    siteName: process.env.OPENROUTER_SITE_NAME || "CareIQ",
    model: process.env.OPENROUTER_MODEL || "openai/gpt-5-chat",
  };
}

export async function POST(req: Request) {
  let env: ReturnType<typeof assertEnv>;
  try {
    env = assertEnv();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const model = body?.model || env.model;

  // Add system prompt for nursing home context
  const systemPrompt = {
    role: "system",
    content: `You are CareIQ, an expert AI assistant for U.S. nursing home compliance and operations. 

Provide accurate, practical guidance on:
- CMS regulations and requirements
- State nursing home regulations  
- Survey preparation and compliance
- Clinical operations and best practices
- Staff training and development

Always:
- Cite specific regulation numbers (e.g., "42 CFR 483.12")
- Mention source documents when relevant
- Provide actionable, step-by-step guidance
- Note state-specific variations when applicable

Keep responses concise but comprehensive.`
  };

  const finalMessages = [systemPrompt, ...messages];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.siteUrl || "https://example.com",
        "X-Title": env.siteName,
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: false,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const hint =
        res.status === 401
          ? "Unauthorized from OpenRouter. Verify the API key in Vercel (no quotes, no spaces) and that you redeployed after adding it."
          : `OpenRouter error ${res.status}.`;
      return NextResponse.json({ error: hint, detail: text.slice(0, 1000) }, { status: 500 });
    }

    const data = await res.json();
    
    // Extract the response content
    const content = data?.choices?.[0]?.message?.content || "No response generated.";
    
    return NextResponse.json({ 
      ok: true,
      content,
      usage: data?.usage,
      model: data?.model 
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Network error contacting OpenRouter.", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}