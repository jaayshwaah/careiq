import { NextResponse } from 'next/server';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    // If no key, run in mock mode so UI still works
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({
        reply: "👋 (Mock) I’m running in local dev without a model key. Add OPENROUTER_API_KEY to use real responses.",
        provider: "mock",
      });
    }

    // Call OpenRouter
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CareIQ',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
        messages,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Upstream error: ${res.status} ${text}` }, { status: 500 });
    }

    const data = await res.json();

    const reply =
      data?.choices?.[0]?.message?.content ??
      "No content returned from model.";

    return NextResponse.json({ reply, provider: "openrouter" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
