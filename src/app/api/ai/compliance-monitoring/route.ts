// Intelligent Compliance Monitoring API
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

interface ComplianceMonitoringRequest {
  facility_id: string;
  monitoring_period: 'daily' | 'weekly' | 'monthly';
  data_sources: {
    staffing_data?: any[];
    incident_reports?: any[];
    quality_indicators?: any[];
    compliance_checks?: any[];
    resident_assessments?: any[];
  };
  alert_thresholds?: {
    staffing_variance: number;
    incident_frequency: number;
    quality_score_minimum: number;
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
      facility_id,
      monitoring_period,
      data_sources,
      alert_thresholds
    }: ComplianceMonitoringRequest = await req.json();

    if (!facility_id || !data_sources) {
      return NextResponse.json({ error: "Facility ID and data sources are required" }, { status: 400 });
    }

    // Perform intelligent compliance analysis
    const complianceAnalysis = await performComplianceAnalysis({
      facility_id,
      monitoring_period,
      data_sources,
      alert_thresholds
    });

    // Store monitoring results
    const { data: monitoringRecord, error: dbError } = await supa
      .from('compliance_monitoring')
      .insert({
        facility_id,
        user_id: user.id,
        monitoring_period,
        data_sources,
        alert_thresholds: alert_thresholds || null,
        analysis_result: complianceAnalysis,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing monitoring results:', dbError);
    }

    return NextResponse.json({
      compliance_analysis: complianceAnalysis,
      monitoring_id: monitoringRecord?.id,
      message: "Compliance monitoring completed successfully"
    });

  } catch (error: any) {
    console.error('Compliance monitoring error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function performComplianceAnalysis({
  facility_id,
  monitoring_period,
  data_sources,
  alert_thresholds
}: {
  facility_id: string;
  monitoring_period: string;
  data_sources: any;
  alert_thresholds?: any;
}) {
  const systemPrompt = `You are CareIQ, an expert AI assistant specialized in real-time nursing home compliance monitoring and risk assessment.

Your task is to analyze facility data and provide intelligent compliance monitoring including:
1. Real-time compliance scoring
2. Early warning system for potential violations
3. Trend analysis and pattern recognition
4. Automated risk assessment
5. Proactive intervention recommendations

Use advanced analytics to identify patterns, anomalies, and risk factors that could lead to compliance issues.

Return your analysis as a structured JSON object with this format:
{
  "compliance_score": 88,
  "risk_level": "low",
  "monitoring_summary": {
    "period_analyzed": "weekly",
    "data_points_processed": 150,
    "anomalies_detected": 3,
    "trends_identified": 2
  },
  "compliance_alerts": [
    {
      "alert_type": "staffing|quality|safety|documentation",
      "severity": "low|medium|high|critical",
      "description": "alert description",
      "affected_area": "specific area",
      "recommended_action": "immediate action needed",
      "timeline": "immediate|24_hours|7_days"
    }
  ],
  "trend_analysis": [
    {
      "metric": "staffing_ratio",
      "trend": "improving|stable|declining",
      "change_percentage": 5.2,
      "significance": "significant|moderate|minor",
      "implications": "what this means for compliance"
    }
  ],
  "risk_assessment": {
    "current_risks": [
      {
        "risk_category": "staffing|quality|safety",
        "risk_level": "low|medium|high",
        "probability": 25,
        "impact": "low|medium|high",
        "mitigation_strategies": ["strategy1", "strategy2"]
      }
    ],
    "emerging_risks": [
      {
        "risk_description": "description",
        "early_warning_signs": ["sign1", "sign2"],
        "preventive_measures": ["measure1", "measure2"]
      }
    ]
  },
  "performance_metrics": {
    "staffing_compliance": {
      "score": 92,
      "status": "compliant",
      "variance": 2.1,
      "recommendations": ["rec1", "rec2"]
    },
    "quality_indicators": {
      "score": 85,
      "status": "needs_attention",
      "trend": "improving",
      "focus_areas": ["area1", "area2"]
    },
    "safety_compliance": {
      "score": 95,
      "status": "excellent",
      "incident_trend": "decreasing",
      "strengths": ["strength1", "strength2"]
    }
  },
  "intervention_recommendations": [
    {
      "priority": "high|medium|low",
      "category": "staffing|training|policy|equipment",
      "recommendation": "specific recommendation",
      "expected_impact": "high|medium|low",
      "implementation_timeline": "immediate|1_week|1_month",
      "resources_required": ["resource1", "resource2"]
    }
  ],
  "predictive_insights": {
    "next_30_days": {
      "predicted_compliance_score": 90,
      "risk_factors": ["factor1", "factor2"],
      "opportunities": ["opportunity1", "opportunity2"]
    },
    "next_90_days": {
      "predicted_compliance_score": 92,
      "long_term_trends": ["trend1", "trend2"],
      "strategic_recommendations": ["rec1", "rec2"]
    }
  },
  "action_plan": {
    "immediate_actions": ["action1", "action2"],
    "short_term_goals": ["goal1", "goal2"],
    "long_term_strategies": ["strategy1", "strategy2"]
  }
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: `Analyze compliance data for facility ${facility_id}:

Monitoring Period: ${monitoring_period}
Data Sources: ${JSON.stringify(data_sources)}
Alert Thresholds: ${JSON.stringify(alert_thresholds || {})}

Provide comprehensive compliance monitoring analysis and recommendations.`
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
        compliance_score: 75,
        risk_level: "medium",
        monitoring_summary: {
          period_analyzed: monitoring_period,
          data_points_processed: 0,
          anomalies_detected: 0,
          trends_identified: 0
        },
        compliance_alerts: [],
        trend_analysis: [],
        risk_assessment: {
          current_risks: [],
          emerging_risks: []
        },
        performance_metrics: {
          staffing_compliance: { score: 80, status: "needs_attention", variance: 0, recommendations: [] },
          quality_indicators: { score: 75, status: "needs_attention", trend: "stable", focus_areas: [] },
          safety_compliance: { score: 85, status: "good", incident_trend: "stable", strengths: [] }
        },
        intervention_recommendations: [],
        predictive_insights: {
          next_30_days: { predicted_compliance_score: 80, risk_factors: [], opportunities: [] },
          next_90_days: { predicted_compliance_score: 85, long_term_trends: [], strategic_recommendations: [] }
        },
        action_plan: {
          immediate_actions: ["Review current compliance status"],
          short_term_goals: ["Improve compliance scores"],
          long_term_strategies: ["Implement continuous improvement"]
        },
        raw_analysis: aiResponse
      };
    }
  } catch (error) {
    console.error('AI compliance analysis error:', error);
    throw new Error("Failed to perform compliance analysis");
  }
}
