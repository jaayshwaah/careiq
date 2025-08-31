// src/app/api/knowledge-extraction/route.ts - AI-powered knowledge extraction from chat messages
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { providerFromEnv } from "@/lib/ai/providers";

const EXTRACTION_SYSTEM_PROMPT = `You are a healthcare compliance knowledge extraction expert. Your job is to analyze chat messages and extract valuable knowledge for nursing home compliance teams.

Extract key knowledge from the provided content following these guidelines:

1. **Title**: Create a concise, searchable title (max 100 characters)
2. **Content**: Extract the core knowledge, rewriting for clarity and completeness
3. **Category**: Choose the most appropriate category from the compliance areas
4. **Key Concepts**: Identify 3-5 key concepts or terms
5. **Compliance Areas**: Identify relevant regulatory/compliance areas
6. **Confidence Score**: Rate how valuable this knowledge is (0.0-1.0)

Categories:
- Survey Preparation
- F-Tags & Deficiencies  
- Staff Training
- Policy & Procedures
- Incident Management
- Quality Assurance
- Documentation
- Regulatory Updates
- Best Practices
- General Knowledge

Return ONLY a JSON object with this structure:
{
  "title": "Clear, searchable title",
  "content": "Rewritten knowledge content with key insights",
  "category": "Most appropriate category",
  "tags": ["relevant", "tags", "array"],
  "confidence_score": 0.85,
  "source_type": "chat",
  "metadata": {
    "key_concepts": ["concept1", "concept2", "concept3"],
    "compliance_areas": ["area1", "area2"],
    "extracted_at": "ISO timestamp"
  }
}

Focus on extracting actionable knowledge that would be valuable for nursing home staff, administrators, and compliance teams.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, source_type = 'chat', metadata = {} } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
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

    // Use AI to extract knowledge
    const provider = providerFromEnv();
    
    const messages = [
      { role: "system" as const, content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user" as const, content: `Extract knowledge from this content:\n\n${content}` }
    ];

    const extractedText = await provider.complete(messages, {
      temperature: 0.3,
      max_tokens: 1500,
    });

    // Parse the JSON response
    let knowledgeItem;
    try {
      knowledgeItem = JSON.parse(extractedText.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', extractedText);
      return NextResponse.json({ error: 'Failed to parse extracted knowledge' }, { status: 500 });
    }

    // Validate and enhance the extracted knowledge
    if (!knowledgeItem.title || !knowledgeItem.content) {
      return NextResponse.json({ error: 'Invalid knowledge extraction' }, { status: 500 });
    }

    // Ensure required fields
    knowledgeItem.source_type = source_type;
    knowledgeItem.metadata = {
      ...metadata,
      ...knowledgeItem.metadata,
      extracted_at: new Date().toISOString(),
    };

    // Ensure confidence score is valid
    if (!knowledgeItem.confidence_score || knowledgeItem.confidence_score < 0 || knowledgeItem.confidence_score > 1) {
      knowledgeItem.confidence_score = 0.7; // Default confidence
    }

    // Ensure tags array exists
    if (!Array.isArray(knowledgeItem.tags)) {
      knowledgeItem.tags = [];
    }

    // Ensure key concepts and compliance areas exist
    if (!knowledgeItem.metadata.key_concepts) {
      knowledgeItem.metadata.key_concepts = [];
    }
    if (!knowledgeItem.metadata.compliance_areas) {
      knowledgeItem.metadata.compliance_areas = [];
    }

    return NextResponse.json({
      success: true,
      knowledge_item: knowledgeItem
    });

  } catch (error) {
    console.error('Knowledge extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract knowledge' },
      { status: 500 }
    );
  }
}