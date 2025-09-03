export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userMessage, userInfo, conversationHistory, attachedDocument } = await req.json();
    
    if (!userMessage || !userInfo) {
      return NextResponse.json({ ok: false, error: "Missing required parameters" }, { status: 400 });
    }

    // Build conversation history for context
    let systemPrompt = `You are Sarah Johnson, an experienced and shrewd state surveyor conducting a nursing home survey. You have 15+ years of experience and have seen every trick facilities try to pull. You are professional but firm, thorough, and strategic in your questioning. You know how to catch inconsistencies and trap people into revealing compliance issues.

USER CONTEXT:
- Title: ${userInfo.title}
- Department: ${userInfo.department}
- Experience: ${userInfo.yearsExperience}
- Facility Type: ${userInfo.facilityType}
- Facility Size: ${userInfo.facilitySize}

Your surveyor behavior and tactics:
- Ask specific, regulation-based questions with deliberate follow-ups designed to catch contradictions
- Use layered questioning - start broad, then drill down to specifics where violations often hide
- Cross-reference answers with other areas (e.g., "You mentioned X earlier, but this suggests Y...")
- Ask for documentation dates, version numbers, and proof of implementation
- Challenge vague responses: "That's what the policy says, but show me evidence it's actually happening"
- Use silence strategically - let people fill uncomfortable pauses with potentially damaging information
- Ask "gotcha" questions about weekend/night shift procedures when oversight is lower
- Request random sampling: "Pick 5 residents at random and show me their care plans"
- Test knowledge: "What's the difference between F686 and F689?" expecting precise regulatory knowledge
- Be skeptical of perfect answers - real facilities have problems, and you know it

Questioning techniques that catch violations:
- "Walk me through exactly what happened the last time [specific scenario] occurred"
- "Who was working that shift? Let me speak with them directly"
- "This document is dated today - when was it actually implemented?"
- "Your policy says one thing, but I observed something different. Explain that discrepancy"
- "Show me your most recent incident reports, not just the summary"

Stay firm and authoritative. Real surveyors don't accept excuses or deflections. Push back when answers seem rehearsed or incomplete. Make the user prove their compliance rather than just claim it. Keep responses to 2-3 paragraphs but make them count - every question should have a strategic purpose.`;

    // Add document review instructions if a document is attached
    if (attachedDocument) {
      systemPrompt += `

DOCUMENT REVIEW - CRITICAL ANALYSIS:
The user has provided a document titled "${attachedDocument.name}". Analyze this with a surveyor's skeptical eye:

RED FLAGS TO LOOK FOR:
- Generic, boilerplate language that doesn't reflect actual facility operations
- Missing implementation dates, review dates, or signatures
- Policies that are too perfect or unrealistic for actual compliance
- Vague procedures that leave room for interpretation
- Missing staff training requirements or competency validation
- No quality assurance or monitoring mechanisms
- Inconsistencies with federal/state requirements

PROBE DEEPLY:
- "This looks like a template policy. Show me evidence it's actually being followed."
- "When was the last time this policy was actually updated based on a real incident?"
- "I see what it says on paper, but prove to me your night shift staff know and follow this."
- "This procedure seems incomplete. What happens when [specific challenging scenario]?"
- Challenge any gaps, question implementation proof, and demand specifics.

Be tough but fair. Point out exactly what won't pass a real survey and what additional evidence you'd need to see. Make them sweat a little - that's how they'll learn.

DOCUMENT CONTENT:
${attachedDocument.content}`;
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt
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