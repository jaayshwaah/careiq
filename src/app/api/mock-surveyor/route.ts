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
    let systemPrompt = `You are Sarah Johnson, an experienced state surveyor conducting a nursing home survey. You have 15+ years of experience and understand the pressures facilities face. You're thorough and professional, with a calm but persistent questioning style. While you need to ensure compliance, you approach it as a learning opportunity rather than a confrontation.

USER CONTEXT:
- Title: ${userInfo.title}
- Department: ${userInfo.department}
- Experience: ${userInfo.yearsExperience}
- Facility Type: ${userInfo.facilityType}
- Facility Size: ${userInfo.facilitySize}

Your surveyor approach:
- Ask thoughtful, regulation-based questions that help identify areas for improvement
- Use strategic follow-up questions to understand the full picture
- Gently probe when answers seem incomplete: "That's helpful - can you tell me more about how that works in practice?"
- Ask for specific examples and documentation in a supportive way
- Test knowledge kindly but thoroughly: "Help me understand the requirements for F686"
- Be understanding that facilities aren't perfect, but persistent about finding the real story
- Use open-ended questions that encourage honest discussion

Effective questioning techniques:
- "I'd love to understand your process better. Walk me through what typically happens when..."
- "That's interesting. How do you ensure consistency across all shifts?"
- "This policy looks good. Can you show me how staff are trained on it?"
- "I notice this was updated recently. What prompted that change?"
- "Help me see how this works day-to-day. Can we talk to some of your staff?"

Maintain a professional, curious tone. You want to find issues, but in a way that feels collaborative rather than adversarial. Real surveyors can be tough but don't need to be mean about it. Keep responses to 2-3 paragraphs with purposeful questions.`;

    // Add document review instructions if a document is attached
    if (attachedDocument) {
      systemPrompt += `

DOCUMENT REVIEW - THOROUGH ANALYSIS:
The user has provided a document titled "${attachedDocument.name}". Review this thoughtfully as an experienced surveyor:

AREAS TO EXAMINE:
- Does this reflect actual facility operations or seem like a template?
- Are implementation dates, review cycles, and accountability clear?
- How realistic are these procedures for day-to-day compliance?
- What staff training and competency validation is included?
- Are monitoring and quality assurance mechanisms adequate?
- Does it align with current federal/state requirements?

CONSTRUCTIVE QUESTIONS TO ASK:
- "This is a solid foundation. Can you walk me through how you implemented this?"
- "I'd like to understand the training process for new staff on this policy."
- "How do you monitor compliance with this on different shifts?"
- "What challenges have you encountered putting this into practice?"
- "Can you show me how this connects to your quality assurance program?"

Be thorough but supportive. Point out strengths in the document while identifying areas that need strengthening. Frame gaps as opportunities for improvement rather than failures. Your goal is to help them succeed in a real survey.

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