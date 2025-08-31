// src/app/api/generate-letter/route.ts - AI-powered letter and email generation
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { providerFromEnv } from "@/lib/ai/providers";

const LETTER_GENERATION_SYSTEM_PROMPT = `You are a professional healthcare compliance communication specialist. Your job is to generate well-structured, professional letters and emails for nursing home facilities to communicate with various stakeholders.

Generate communications that are:
1. Professional and respectful in tone
2. Compliant with healthcare regulations
3. Clear and concise
4. Action-oriented where appropriate
5. Properly formatted for the communication type

For each request, generate 2-3 variations with different approaches (formal, direct, collaborative).

Return ONLY a JSON array with this structure:
[
  {
    "title": "Descriptive title for the communication",
    "content": "Full letter/email content with proper formatting",
    "description": "Brief description of the approach/tone",
    "urgency": "low|medium|high",
    "tags": ["relevant", "tags", "array"],
    "compliance_areas": ["relevant compliance areas"]
  }
]

Key guidelines:
- Include proper salutations and closings for letters
- Use subject lines for emails
- Include placeholder fields in [brackets] for customization
- Reference relevant regulations when appropriate (F-tags, CFR sections)
- Maintain professional healthcare industry standards
- Consider HIPAA implications in family communications
- Include follow-up actions or next steps when relevant`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context, category, recipient_type, urgency = 'medium', type = 'email' } = body;

    if (!context?.trim() || !category || !recipient_type) {
      return NextResponse.json({ error: 'Context, category, and recipient_type are required' }, { status: 400 });
    }

    // Get auth session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = supabaseServerWithAuth(token);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Build the generation prompt
    const prompt = `Generate ${type === 'email' ? 'professional emails' : 'formal business letters'} for the following scenario:

Context: ${context}
Category: ${category}
Recipient Type: ${recipient_type}
Urgency Level: ${urgency}
Communication Type: ${type}

Generate 2-3 variations with different approaches (formal, direct, collaborative) that address this situation professionally and appropriately for a healthcare compliance context.

${type === 'letter' ? 'Include proper letterhead placeholders, addresses, dates, and formal business letter structure.' : 'Include clear subject lines and professional email structure.'}

Focus on:
- Clear communication of the issue/purpose
- Appropriate tone for the recipient type
- Compliance considerations
- Next steps or action items
- Professional healthcare industry standards`;

    // Use AI to generate letter suggestions
    const provider = providerFromEnv();
    
    const messages = [
      { role: "system" as const, content: LETTER_GENERATION_SYSTEM_PROMPT },
      { role: "user" as const, content: prompt }
    ];

    const generatedText = await provider.complete(messages, {
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(generatedText.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText);
      return NextResponse.json({ error: 'Failed to parse generated content' }, { status: 500 });
    }

    // Validate and enhance the suggestions
    if (!Array.isArray(suggestions)) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    // Enhance each suggestion with metadata
    const enhancedSuggestions = suggestions.map((suggestion: any) => ({
      id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: suggestion.title || `${category} - ${recipient_type}`,
      content: suggestion.content || '',
      description: suggestion.description || `Generated ${type} for ${category.toLowerCase()}`,
      category,
      type,
      urgency,
      recipient_type,
      tags: suggestion.tags || [category.toLowerCase().replace(/\s+/g, '-'), recipient_type.toLowerCase().replace(/\s+/g, '-')],
      compliance_areas: suggestion.compliance_areas || [],
      created_at: new Date().toISOString()
    })).filter((s: any) => s.content && s.title);

    // Save suggestions to knowledge base for future reference
    try {
      const saveTasks = enhancedSuggestions.map(async (suggestion: any) => {
        const suggestionData = {
          user_id: user.id,
          content_type: 'letter_suggestion',
          title: suggestion.title,
          data: suggestion,
          tags: suggestion.tags,
          metadata: {
            category,
            recipient_type,
            urgency,
            type,
            generated_at: new Date().toISOString()
          }
        };

        return supabase.from('knowledge_base').insert(suggestionData);
      });

      await Promise.all(saveTasks);
    } catch (saveError) {
      console.warn('Failed to save suggestions to knowledge base:', saveError);
      // Don't fail the request if saving fails
    }

    return NextResponse.json({
      success: true,
      suggestions: enhancedSuggestions
    });

  } catch (error) {
    console.error('Letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate letter suggestions' },
      { status: 500 }
    );
  }
}