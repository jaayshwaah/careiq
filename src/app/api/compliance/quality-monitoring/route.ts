// Advanced Compliance & Quality Monitoring API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QualityMonitoringRequest {
  facility_id: string;
  monitoring_type: 'comprehensive' | 'focused' | 'real_time';
  focus_areas?: string[];
  alert_thresholds?: {
    quality_score_minimum: number;
    compliance_violation_threshold: number;
    response_time_maximum: number;
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
      monitoring_type,
      focus_areas,
      alert_thresholds
    }: QualityMonitoringRequest = await req.json();

    if (!facility_id || !monitoring_type) {
      return NextResponse.json({ error: "Facility ID and monitoring type are required" }, { status: 400 });
    }

    // Perform comprehensive quality monitoring
    const qualityAssessment = await performQualityMonitoring({
      facility_id,
      monitoring_type,
      focus_areas,
      alert_thresholds,
      supa
    });

    // Store quality assessment
    const { data: assessmentRecord, error: dbError } = await supa
      .from('quality_assessments')
      .insert({
        facility_id,
        user_id: user.id,
        monitoring_type,
        focus_areas: focus_areas || [],
        alert_thresholds: alert_thresholds || {},
        assessment_result: qualityAssessment,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing quality assessment:', dbError);
    }

    return NextResponse.json({
      quality_assessment: qualityAssessment,
      assessment_id: assessmentRecord?.id,
      message: "Quality monitoring completed successfully"
    });

  } catch (error: any) {
    console.error('Quality monitoring error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function performQualityMonitoring({
  facility_id,
  monitoring_type,
  focus_areas,
  alert_thresholds,
  supa
}: {
  facility_id: string;
  monitoring_type: string;
  focus_areas?: string[];
  alert_thresholds?: any;
  supa: any;
}) {
  const assessment: any = {
    overall_score: 0,
    compliance_status: 'compliant',
    risk_level: 'low',
    quality_metrics: {},
    compliance_gaps: [],
    recommendations: [],
    alerts: [],
    trends: {},
    benchmarks: {}
  };

  try {
    // 1. Gather current quality data
    const qualityData = await gatherQualityData(facility_id, supa);
    
    // 2. Analyze compliance status
    const complianceAnalysis = await analyzeComplianceStatus(facility_id, supa);
    
    // 3. Calculate quality metrics
    const qualityMetrics = await calculateQualityMetrics(qualityData);
    
    // 4. Identify compliance gaps
    const complianceGaps = await identifyComplianceGaps(complianceAnalysis);
    
    // 5. Generate recommendations
    const recommendations = await generateRecommendations(qualityMetrics, complianceGaps);
    
    // 6. Create alerts
    const alerts = await createQualityAlerts(qualityMetrics, alert_thresholds);
    
    // 7. Analyze trends
    const trends = await analyzeQualityTrends(facility_id, supa);
    
    // 8. Compare benchmarks
    const benchmarks = await compareBenchmarks(qualityMetrics);

    // Compile assessment
    assessment.quality_metrics = qualityMetrics;
    assessment.compliance_gaps = complianceGaps;
    assessment.recommendations = recommendations;
    assessment.alerts = alerts;
    assessment.trends = trends;
    assessment.benchmarks = benchmarks;
    
    // Calculate overall score
    assessment.overall_score = calculateOverallScore(qualityMetrics);
    assessment.compliance_status = determineComplianceStatus(complianceGaps);
    assessment.risk_level = determineRiskLevel(alerts, complianceGaps);

    return assessment;

  } catch (error) {
    console.error('Quality monitoring error:', error);
    throw error;
  }
}

async function gatherQualityData(facility_id: string, supa: any) {
  const qualityData: any = {};

  try {
    // Get quality indicators
    const { data: indicators, error: indicatorsError } = await supa
      .from('quality_indicators')
      .select('*')
      .eq('facility_id', facility_id)
      .eq('status', 'active')
      .order('measurement_date', { ascending: false });

    if (!indicatorsError && indicators) {
      qualityData.indicators = indicators;
    }

    // Get compliance events
    const { data: events, error: eventsError } = await supa
      .from('compliance_events')
      .select('*')
      .eq('facility_id', facility_id)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!eventsError && events) {
      qualityData.events = events;
    }

    // Get staffing data
    const { data: staffing, error: staffingError } = await supa
      .from('staff_shifts')
      .select('*')
      .eq('facility_id', facility_id)
      .gte('shift_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (!staffingError && staffing) {
      qualityData.staffing = staffing;
    }

    // Get census data
    const { data: census, error: censusError } = await supa
      .from('census_snapshots')
      .select('*')
      .eq('facility_id', facility_id)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (!censusError && census) {
      qualityData.census = census;
    }

    return qualityData;

  } catch (error) {
    console.error('Error gathering quality data:', error);
    return {};
  }
}

async function analyzeComplianceStatus(facility_id: string, supa: any) {
  const analysis: any = {
    f_tag_compliance: {},
    regulation_violations: [],
    compliance_score: 0,
    risk_factors: []
  };

  try {
    // Get CMS regulations
    const { data: regulations, error: regError } = await supa
      .from('cms_regulations')
      .select('*')
      .eq('is_active', true);

    if (!regError && regulations) {
      // Analyze compliance against each regulation
      for (const regulation of regulations) {
        const complianceStatus = await assessRegulationCompliance(regulation, facility_id, supa);
        analysis.f_tag_compliance[regulation.f_tag] = complianceStatus;
      }
    }

    // Calculate overall compliance score
    const complianceScores = Object.values(analysis.f_tag_compliance).map((status: any) => status.score || 0);
    analysis.compliance_score = complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length;

    return analysis;

  } catch (error) {
    console.error('Error analyzing compliance status:', error);
    return analysis;
  }
}

async function assessRegulationCompliance(regulation: any, facility_id: string, supa: any) {
  const status: any = {
    f_tag: regulation.f_tag,
    title: regulation.title,
    score: 85, // This would be calculated based on actual data
    status: 'compliant',
    violations: [],
    recommendations: []
  };

  // This is a simplified assessment - in reality, this would analyze
  // actual facility data against specific regulation requirements
  
  if (regulation.f_tag === 'F-514') {
    // Staffing regulation assessment
    const { data: staffing, error } = await supa
      .from('staff_shifts')
      .select('*')
      .eq('facility_id', facility_id)
      .gte('shift_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (!error && staffing) {
      const avgStaffPerDay = staffing.length / 7;
      if (avgStaffPerDay < 2) {
        status.score = 60;
        status.status = 'needs_attention';
        status.violations.push('Insufficient staffing levels detected');
        status.recommendations.push('Increase staffing to meet regulatory requirements');
      }
    }
  }

  if (regulation.f_tag === 'F-686') {
    // Infection control assessment
    status.score = 90;
    status.status = 'compliant';
    status.recommendations.push('Continue current infection control practices');
  }

  return status;
}

async function calculateQualityMetrics(qualityData: any) {
  const metrics: any = {
    overall_quality_score: 0,
    staffing_adequacy: 0,
    infection_control: 0,
    medication_management: 0,
    resident_care: 0,
    environmental_safety: 0
  };

  try {
    // Calculate staffing adequacy
    if (qualityData.staffing && qualityData.census) {
      const avgStaffPerDay = qualityData.staffing.length / 30;
      const avgOccupancy = qualityData.census.reduce((sum: number, c: any) => sum + c.occupied_beds, 0) / qualityData.census.length;
      metrics.staffing_adequacy = Math.min(100, (avgStaffPerDay / (avgOccupancy / 10)) * 100);
    }

    // Calculate infection control score
    if (qualityData.events) {
      const infectionEvents = qualityData.events.filter((e: any) => e.category === 'infection_control');
      metrics.infection_control = Math.max(0, 100 - (infectionEvents.length * 10));
    }

    // Calculate overall quality score
    const scores = Object.values(metrics).filter(v => typeof v === 'number' && v > 0);
    metrics.overall_quality_score = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

    return metrics;

  } catch (error) {
    console.error('Error calculating quality metrics:', error);
    return metrics;
  }
}

async function identifyComplianceGaps(complianceAnalysis: any) {
  const gaps: any[] = [];

  try {
    // Identify F-tag violations
    Object.entries(complianceAnalysis.f_tag_compliance).forEach(([fTag, status]: [string, any]) => {
      if (status.score < 80) {
        gaps.push({
          regulation: fTag,
          title: status.title,
          severity: status.score < 60 ? 'high' : 'medium',
          description: status.violations.join(', '),
          recommendations: status.recommendations,
          impact: 'compliance_risk'
        });
      }
    });

    return gaps;

  } catch (error) {
    console.error('Error identifying compliance gaps:', error);
    return gaps;
  }
}

async function generateRecommendations(qualityMetrics: any, complianceGaps: any[]) {
  const recommendations: any[] = [];

  try {
    // Generate recommendations based on quality metrics
    if (qualityMetrics.staffing_adequacy < 80) {
      recommendations.push({
        priority: 'high',
        category: 'staffing',
        title: 'Improve Staffing Levels',
        description: 'Current staffing levels are below optimal. Consider hiring additional staff or adjusting schedules.',
        timeline: '30_days',
        resources_needed: ['HR', 'Budget'],
        expected_impact: 'high'
      });
    }

    if (qualityMetrics.infection_control < 90) {
      recommendations.push({
        priority: 'high',
        category: 'infection_control',
        title: 'Strengthen Infection Control',
        description: 'Review and enhance infection control protocols and staff training.',
        timeline: '14_days',
        resources_needed: ['Training', 'Supplies'],
        expected_impact: 'high'
      });
    }

    // Generate recommendations from compliance gaps
    complianceGaps.forEach(gap => {
      recommendations.push({
        priority: gap.severity === 'high' ? 'critical' : 'high',
        category: 'compliance',
        title: `Address ${gap.regulation} Compliance`,
        description: gap.description,
        timeline: gap.severity === 'high' ? '7_days' : '30_days',
        resources_needed: ['Compliance Team', 'Training'],
        expected_impact: 'high'
      });
    });

    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return recommendations;
  }
}

async function createQualityAlerts(qualityMetrics: any, alertThresholds?: any) {
  const alerts: any[] = [];

  try {
    const thresholds = alertThresholds || {
      quality_score_minimum: 80,
      compliance_violation_threshold: 1,
      response_time_maximum: 24
    };

    // Quality score alert
    if (qualityMetrics.overall_quality_score < thresholds.quality_score_minimum) {
      alerts.push({
        type: 'quality_score',
        severity: 'high',
        title: 'Quality Score Below Threshold',
        description: `Current quality score (${qualityMetrics.overall_quality_score.toFixed(1)}) is below minimum threshold (${thresholds.quality_score_minimum})`,
        action_required: 'immediate',
        escalation_level: 1
      });
    }

    // Staffing alert
    if (qualityMetrics.staffing_adequacy < 70) {
      alerts.push({
        type: 'staffing',
        severity: 'critical',
        title: 'Critical Staffing Shortage',
        description: 'Staffing levels are critically low and may impact resident care',
        action_required: 'immediate',
        escalation_level: 2
      });
    }

    // Infection control alert
    if (qualityMetrics.infection_control < 85) {
      alerts.push({
        type: 'infection_control',
        severity: 'high',
        title: 'Infection Control Concerns',
        description: 'Infection control metrics indicate potential issues',
        action_required: '24_hours',
        escalation_level: 1
      });
    }

    return alerts;

  } catch (error) {
    console.error('Error creating quality alerts:', error);
    return alerts;
  }
}

async function analyzeQualityTrends(facility_id: string, supa: any) {
  const trends: any = {
    quality_score_trend: 'stable',
    improvement_areas: [],
    declining_areas: [],
    trend_analysis: {}
  };

  try {
    // Get historical quality data
    const { data: historicalData, error } = await supa
      .from('quality_indicators')
      .select('*')
      .eq('facility_id', facility_id)
      .gte('measurement_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('measurement_date', { ascending: true });

    if (!error && historicalData) {
      // Analyze trends
      const monthlyGroups = historicalData.reduce((groups: any, indicator: any) => {
        const month = indicator.measurement_date.substring(0, 7); // YYYY-MM
        if (!groups[month]) groups[month] = [];
        groups[month].push(indicator);
        return groups;
      }, {});

      const monthlyScores = Object.keys(monthlyGroups).map(month => {
        const monthIndicators = monthlyGroups[month];
        const avgScore = monthIndicators.reduce((sum: number, i: any) => sum + (i.indicator_value || 0), 0) / monthIndicators.length;
        return { month, score: avgScore };
      });

      if (monthlyScores.length >= 2) {
        const recentScore = monthlyScores[monthlyScores.length - 1].score;
        const previousScore = monthlyScores[monthlyScores.length - 2].score;
        
        if (recentScore > previousScore + 5) {
          trends.quality_score_trend = 'improving';
        } else if (recentScore < previousScore - 5) {
          trends.quality_score_trend = 'declining';
        }
      }

      trends.trend_analysis = {
        monthly_scores: monthlyScores,
        trend_direction: trends.quality_score_trend,
        confidence_level: 'medium'
      };
    }

    return trends;

  } catch (error) {
    console.error('Error analyzing quality trends:', error);
    return trends;
  }
}

async function compareBenchmarks(qualityMetrics: any) {
  const benchmarks: any = {
    industry_average: {},
    top_performers: {},
    facility_ranking: 'above_average',
    improvement_potential: []
  };

  try {
    // Industry benchmarks (simplified)
    benchmarks.industry_average = {
      overall_quality_score: 82,
      staffing_adequacy: 85,
      infection_control: 88,
      medication_management: 90,
      resident_care: 87,
      environmental_safety: 89
    };

    // Top performers benchmarks
    benchmarks.top_performers = {
      overall_quality_score: 95,
      staffing_adequacy: 98,
      infection_control: 99,
      medication_management: 98,
      resident_care: 96,
      environmental_safety: 97
    };

    // Compare facility performance
    const facilityScore = qualityMetrics.overall_quality_score;
    const industryScore = benchmarks.industry_average.overall_quality_score;
    const topPerformerScore = benchmarks.top_performers.overall_quality_score;

    if (facilityScore >= topPerformerScore - 5) {
      benchmarks.facility_ranking = 'top_performer';
    } else if (facilityScore >= industryScore) {
      benchmarks.facility_ranking = 'above_average';
    } else if (facilityScore >= industryScore - 10) {
      benchmarks.facility_ranking = 'average';
    } else {
      benchmarks.facility_ranking = 'below_average';
    }

    // Identify improvement potential
    Object.keys(qualityMetrics).forEach(metric => {
      if (typeof qualityMetrics[metric] === 'number') {
        const gap = benchmarks.top_performers[metric] - qualityMetrics[metric];
        if (gap > 10) {
          benchmarks.improvement_potential.push({
            metric,
            current_score: qualityMetrics[metric],
            potential_score: benchmarks.top_performers[metric],
            improvement_gap: gap
          });
        }
      }
    });

    return benchmarks;

  } catch (error) {
    console.error('Error comparing benchmarks:', error);
    return benchmarks;
  }
}

function calculateOverallScore(qualityMetrics: any): number {
  const scores = Object.values(qualityMetrics).filter(v => typeof v === 'number' && v > 0);
  return scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
}

function determineComplianceStatus(complianceGaps: any[]): string {
  const highSeverityGaps = complianceGaps.filter(gap => gap.severity === 'high');
  
  if (highSeverityGaps.length === 0) {
    return 'compliant';
  } else if (highSeverityGaps.length <= 2) {
    return 'needs_attention';
  } else {
    return 'non_compliant';
  }
}

function determineRiskLevel(alerts: any[], complianceGaps: any[]): string {
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  const highSeverityGaps = complianceGaps.filter(gap => gap.severity === 'high');
  
  if (criticalAlerts.length > 0 || highSeverityGaps.length > 3) {
    return 'high';
  } else if (alerts.length > 0 || highSeverityGaps.length > 0) {
    return 'medium';
  } else {
    return 'low';
  }
}
