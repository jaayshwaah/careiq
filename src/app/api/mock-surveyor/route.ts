export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { providerFromEnv } from "@/lib/ai/providers";

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

    const provider = providerFromEnv();
    
    // Use the configured main chat model (GPT-5 if available, falls back to others)
    const response = await provider.complete(messages, {
      temperature: 0.7,
      max_tokens: 500
      // Uses the model configured in OPENROUTER_MODEL environment variable
    });

    if (!response) {
      throw new Error('No response from AI provider');
    }

    return NextResponse.json({
      ok: true,
      response: response.trim()
    });

  } catch (error: any) {
    console.error("Mock surveyor error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate surveyor response" 
    }, { status: 500 });
  }
}