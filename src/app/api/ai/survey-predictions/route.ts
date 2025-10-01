// Predictive Analytics for Survey Readiness API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import OpenAI from "openai";

export const runtime = "nodejs";

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface SurveyPredictionRequest {
  facility_data: {
    facility_name: string;
    state: string;
    bed_count: number;
    last_survey_date: string;
    next_expected_date: string;
    survey_type: string;
  };
  historical_data?: {
    previous_deficiencies: any[];
    compliance_scores: any[];
    staffing_data: any[];
    quality_indicators: any[];
  };
  current_metrics?: {
    staffing_levels: any;
    compliance_status: any;
    quality_scores: any;
    incident_reports: any[];
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
      facility_data,
      historical_data,
      current_metrics
    }: SurveyPredictionRequest = await req.json();

    if (!facility_data) {
      return NextResponse.json({ error: "Facility data is required" }, { status: 400 });
    }

    // Generate predictive analysis
    const predictionResult = await generateSurveyPredictions({
      facility_data,
      historical_data,
      current_metrics
    });

    // Store prediction results
    const { data: predictionRecord, error: dbError } = await supa
      .from('survey_predictions')
      .insert({
        user_id: user.id,
        facility_data,
        historical_data: historical_data || null,
        current_metrics: current_metrics || null,
        prediction_result: predictionResult,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing prediction:', dbError);
    }

    return NextResponse.json({
      predictions: predictionResult,
      prediction_id: predictionRecord?.id,
      message: "Survey predictions generated successfully"
    });

  } catch (error: any) {
    console.error('Survey prediction error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function generateSurveyPredictions({
  facility_data,
  historical_data,
  current_metrics
}: {
  facility_data: any;
  historical_data?: any;
  current_metrics?: any;
}) {
  const systemPrompt = `You are CareIQ, an expert AI assistant specialized in nursing home survey predictions and compliance analytics.

Your task is to analyze facility data and generate comprehensive survey readiness predictions including:
1. Likelihood of deficiencies by category
2. Risk factors and warning signs
3. Recommended preparation strategies
4. Timeline-based action plans
5. Resource allocation recommendations

Use your knowledge of CMS regulations, state requirements, and industry best practices to provide accurate predictions.

Return your analysis as a structured JSON object with this format:
{
  "survey_readiness_score": 85,
  "overall_risk_level": "medium",
  "deficiency_predictions": [
    {
      "category": "Quality of Care",
      "f_tag": "F-514",
      "deficiency_likelihood": "medium",
      "confidence": 75,
      "risk_factors": ["factor1", "factor2"],
      "mitigation_strategies": ["strategy1", "strategy2"]
    }
  ],
  "critical_risk_areas": [
    {
      "area": "staffing",
      "risk_level": "high",
      "description": "risk description",
      "immediate_actions": ["action1", "action2"],
      "timeline": "30_days"
    }
  ],
  "preparation_timeline": {
    "immediate_actions": ["action1", "action2"],
    "30_day_actions": ["action1", "action2"],
    "60_day_actions": ["action1", "action2"],
    "90_day_actions": ["action1", "action2"]
  },
  "resource_recommendations": {
    "staffing_needs": ["need1", "need2"],
    "training_requirements": ["training1", "training2"],
    "equipment_upgrades": ["equipment1", "equipment2"],
    "policy_updates": ["policy1", "policy2"]
  },
  "compliance_priorities": [
    {
      "priority": "high",
      "category": "staffing",
      "action": "specific action",
      "deadline": "2024-02-15",
      "resources_needed": ["resource1"]
    }
  ],
  "success_probability": {
    "deficiency_free": 65,
    "minimal_deficiencies": 25,
    "moderate_deficiencies": 8,
    "significant_deficiencies": 2
  },
  "recommended_focus_areas": [
    {
      "area": "staffing",
      "priority_score": 95,
      "recommendations": ["rec1", "rec2"]
    }
  ]
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Analyze this facility's survey readiness:

Facility Data: ${JSON.stringify(facility_data)}
Historical Data: ${JSON.stringify(historical_data || {})}
Current Metrics: ${JSON.stringify(current_metrics || {})}

Provide comprehensive survey predictions and recommendations.`
        }
      ],
      temperature: 0.1,
      max_tokens: 3000
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback response if JSON parsing fails
      return {
        survey_readiness_score: 70,
        overall_risk_level: "medium",
        deficiency_predictions: [],
        critical_risk_areas: [],
        preparation_timeline: {
          immediate_actions: ["Review current compliance status"],
          "30_day_actions": ["Implement recommended improvements"],
          "60_day_actions": ["Conduct internal audit"],
          "90_day_actions": ["Final preparation review"]
        },
        resource_recommendations: {
          staffing_needs: [],
          training_requirements: [],
          equipment_upgrades: [],
          policy_updates: []
        },
        compliance_priorities: [],
        success_probability: {
          deficiency_free: 60,
          minimal_deficiencies: 30,
          moderate_deficiencies: 8,
          significant_deficiencies: 2
        },
        recommended_focus_areas: [],
        raw_analysis: aiResponse
      };
    }
  } catch (error) {
    console.error('AI prediction error:', error);
    throw new Error("Failed to generate survey predictions");
  }
}
