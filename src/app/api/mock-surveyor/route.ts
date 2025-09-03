export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userMessage, userInfo, conversationHistory } = await req.json();
    
    if (!userMessage || !userInfo) {
      return NextResponse.json({ ok: false, error: "Missing required parameters" }, { status: 400 });
    }

    // Build conversation history for context
    const messages = [
      {
        role: "system",
        content: `You are Sarah Johnson, an experienced state surveyor conducting a nursing home survey. You are thorough, professional, but friendly. You ask specific questions about compliance, request documents, and follow up on responses like a real surveyor would.

USER CONTEXT:
- Title: ${userInfo.title}
- Department: ${userInfo.department}
- Experience: ${userInfo.yearsExperience}
- Facility Type: ${userInfo.facilityType}
- Facility Size: ${userInfo.facilitySize}

Your surveyor behavior:
- Ask specific, regulation-based questions (reference F-tags when relevant)
- Request to see specific documents and policies
- Follow up on answers with deeper questions
- Point out potential compliance issues diplomatically
- Ask about processes, not just policies
- Request to observe or visit specific areas
- Ask for staff interviews
- Be realistic about what a surveyor would actually ask for

Keep responses conversational but professional, like a real surveyor interview. Focus on ONE main topic or request per response. Make requests specific and realistic.

Examples of good surveyor requests:
- "I'd like to review your facility's infection control policies. Can you show me your most recent policy manual?"
- "Can you walk me through how you handle medication errors when they occur?"
- "I'd like to speak with your charge nurse from the evening shift. Is she available?"
- "Can we visit the dining room during the lunch service? I want to observe meal assistance."

Stay in character as Sarah Johnson, the state surveyor. Be conversational and ask follow-up questions based on the user's responses. Keep responses to 2-3 paragraphs maximum.`
      },
      // Add conversation history
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      // Add current user message
      {
        role: "user",
        content: userMessage
      }
    ];

    // Use OpenRouter directly with GPT-4/5
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4-turbo";
    
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq-eight.vercel.app",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response content from AI');
    }

    return NextResponse.json({
      ok: true,
      response: aiResponse.trim()
    });

  } catch (error: any) {
    console.error("Mock surveyor error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate surveyor response" 
    }, { status: 500 });
  }
}