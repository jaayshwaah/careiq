// Advanced AI Document Analysis API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface DocumentAnalysisRequest {
  file_content: string;
  file_type: string;
  analysis_type: 'compliance' | 'policy' | 'assessment' | 'training' | 'comprehensive';
  facility_context?: {
    facility_name: string;
    state: string;
    facility_type: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.WRITE);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      file_content,
      file_type,
      analysis_type = 'comprehensive',
      facility_context
    }: DocumentAnalysisRequest = await req.json();

    if (!file_content || !file_type) {
      return NextResponse.json({ error: "File content and type are required" }, { status: 400 });
    }

    // Enhanced AI analysis based on document type
    const analysisResult = await performAdvancedAnalysis({
      content: file_content,
      type: file_type,
      analysis_type,
      facility_context
    });

    // Store analysis results in database
    const { data: analysisRecord, error: dbError } = await supa
      .from('document_analyses')
      .insert({
        user_id: user.id,
        file_type,
        analysis_type,
        content_preview: file_content.substring(0, 500),
        analysis_result: analysisResult,
        facility_context: facility_context || null,
        processing_status: 'completed'
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing analysis:', dbError);
      // Don't fail the request for DB errors
    }

    return NextResponse.json({
      analysis: analysisResult,
      analysis_id: analysisRecord?.id,
      message: "Document analysis completed successfully"
    });

  } catch (error: any) {
    console.error('Document analysis error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function performAdvancedAnalysis({
  content,
  type,
  analysis_type,
  facility_context
}: {
  content: string;
  type: string;
  analysis_type: string;
  facility_context?: any;
}) {
  const systemPrompt = `You are CareIQ, an expert AI assistant specialized in nursing home compliance and healthcare operations. 

Your task is to perform comprehensive analysis of healthcare documents with focus on:
1. Compliance requirements and potential violations
2. Policy gaps and recommendations
3. Risk assessment and mitigation strategies
4. Actionable insights for facility improvement
5. Regulatory alignment and best practices

Facility Context: ${facility_context ? JSON.stringify(facility_context) : 'Not provided'}

Analysis Type: ${analysis_type}

Return your analysis as a structured JSON object with the following format:
{
  "summary": {
    "document_type": "identified document type",
    "key_themes": ["theme1", "theme2", "theme3"],
    "compliance_status": "compliant|needs_attention|non_compliant",
    "risk_level": "low|medium|high|critical",
    "overall_score": 85
  },
  "compliance_analysis": {
    "applicable_regulations": ["F-514", "F-686", etc.],
    "compliance_gaps": [
      {
        "regulation": "F-514",
        "issue": "description of the gap",
        "severity": "high",
        "recommendation": "specific action to take"
      }
    ],
    "strengths": ["what's working well"],
    "improvement_areas": ["areas needing attention"]
  },
  "risk_assessment": {
    "identified_risks": [
      {
        "risk_type": "staffing|infection_control|medication|etc",
        "description": "risk description",
        "likelihood": "low|medium|high",
        "impact": "low|medium|high",
        "mitigation_strategies": ["strategy1", "strategy2"]
      }
    ],
    "risk_score": 75
  },
  "actionable_recommendations": [
    {
      "priority": "high|medium|low",
      "category": "policy|training|procedure|documentation",
      "recommendation": "specific recommendation",
      "timeline": "immediate|30_days|90_days",
      "resources_needed": ["resource1", "resource2"]
    }
  ],
  "policy_insights": {
    "policy_gaps": ["gap1", "gap2"],
    "best_practices": ["practice1", "practice2"],
    "industry_standards": ["standard1", "standard2"]
  },
  "training_needs": [
    {
      "topic": "training topic",
      "audience": "staff|management|all",
      "urgency": "high|medium|low",
      "estimated_duration": "2_hours"
    }
  ],
  "next_steps": [
    "immediate action 1",
    "immediate action 2",
    "follow-up action 1"
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please analyze this ${type} document:\n\n${content}` }
      ],
      temperature: 0.1,
      max_tokens: 4000
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      // If JSON parsing fails, return structured response
      return {
        summary: {
          document_type: type,
          key_themes: ["Analysis completed"],
          compliance_status: "needs_attention",
          risk_level: "medium",
          overall_score: 70
        },
        compliance_analysis: {
          applicable_regulations: [],
          compliance_gaps: [],
          strengths: [],
          improvement_areas: []
        },
        risk_assessment: {
          identified_risks: [],
          risk_score: 50
        },
        actionable_recommendations: [],
        policy_insights: {
          policy_gaps: [],
          best_practices: [],
          industry_standards: []
        },
        training_needs: [],
        next_steps: ["Review AI analysis", "Implement recommendations"],
        raw_analysis: aiResponse
      };
    }
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error("Failed to perform AI analysis");
  }
}
