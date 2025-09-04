export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) return NextResponse.json({ ok: false, error: "Messages required" }, { status: 400 });

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Use fallback profile data to avoid RLS recursion
    const profile = {
      role: 'user',
      facility_id: null,
      facility_name: 'Healthcare Facility',
      facility_state: null,
      full_name: user.email?.split('@')[0] || 'User'
    };
    
    console.log('Using fallback profile data in contextual chat to avoid RLS issues');

    const last = messages[messages.length - 1];
    const systemPrompt = buildEnhancedSystemPrompt(profile);
    const ragContext = await buildRagContext({
      query: last?.content || "",
      facilityId: profile?.facility_id,
      facilityState: profile?.facility_state,
      topK: 6,
      accessToken: token,
      useVector: true,
    });

    const aiMessages = [
      { role: "system", content: systemPrompt + (ragContext ? `\n\n${ragContext}` : "") },
      ...messages.slice(-6),
    ];

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "AI service not configured" }, { status: 503 });

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq.vercel.app",
        "X-Title": "CareIQ Enhanced Chat",
      },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || "openai/gpt-5-chat", messages: aiMessages, temperature: 0.3, max_tokens: 2000 }), // 🚀 GPT-5 is now available!
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => "");
      console.error("OpenRouter error", response.status, txt);
      return NextResponse.json({ ok: false, error: "AI service error" }, { status: 503 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return NextResponse.json({ ok: true, content, context: { role: profile?.role, facility: profile?.facility_name, state: profile?.facility_state } });
  } catch (error: any) {
    console.error("contextual chat error", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

function buildEnhancedSystemPrompt(profile: any): string {
  const role = profile?.role || "healthcare professional";
  const facility = profile?.facility_name || "your facility";
  const state = profile?.facility_state || "";
  return `You are CareIQ, an expert AI assistant powered by GPT-5 for U.S. nursing home compliance and operations.

TOPIC RESTRICTIONS - IMPORTANT:
You MUST stay focused ONLY on nursing home, long-term care, and healthcare compliance topics. 
- DO NOT discuss politics, current events, entertainment, or unrelated subjects
- If asked about non-nursing home topics, politely redirect: "I'm specialized in nursing home compliance and operations. How can I help you with that instead?"
- Focus exclusively on: CMS regulations, state compliance, MDS assessments, survey preparation, staff training, infection control, resident care, and related healthcare topics

CONTEXT:
- User Role: ${role}
- Facility: ${facility}${state ? ` (${state})` : ''}
- Current Date: ${new Date().toLocaleDateString()}

COMMUNICATION STYLE:
Write responses in clean, professional prose without asterisks or markdown formatting.
Use plain text with proper paragraphs. When listing items, use numbered lists or write in sentence form.

INSTRUCTIONS:
1. Provide role-specific guidance tailored to ${role} responsibilities
2. Reference facility-specific context when relevant
3. Include ${state ? `${state}-specific` : 'state-specific'} requirements when applicable
4. Cite specific regulation numbers (42 CFR, F-tags) with explanations
5. Provide actionable, step-by-step guidance
6. Use clear, professional language without excessive formatting
7. Stay within nursing home compliance and operations scope

If asked "what model is this?" respond: "I am CareIQ, powered by GPT-5, specialized exclusively for nursing home compliance and operations guidance."`;
}

