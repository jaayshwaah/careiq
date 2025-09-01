// Daily Round Generator API - Generate customizable daily round checklists
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { providerFromEnv } from "@/lib/ai/providers";

interface RoundItem {
  id: string;
  category: string;
  task: string;
  frequency: 'hourly' | 'every_2_hours' | 'every_4_hours' | 'every_8_hours' | 'daily' | 'weekly';
  compliance_related: boolean;
  notes?: string;
}

interface DailyRound {
  id: string;
  title: string;
  unit: string;
  shift: '7a-3p' | '3p-11p' | '11p-7a';
  created_by: string;
  created_at: string;
  items: RoundItem[];
  metadata: {
    facility_name: string;
    template_type: string;
  };
}

const defaultRoundTemplates = {
  'unit_manager': [
    {
      category: 'Safety & Environment',
      items: [
        { task: 'Check emergency equipment functionality', frequency: 'daily', compliance_related: true },
        { task: 'Inspect call bell system operation', frequency: 'daily', compliance_related: true },
        { task: 'Verify fire safety equipment', frequency: 'daily', compliance_related: true },
        { task: 'Check hallway lighting and safety', frequency: 'daily', compliance_related: true },
        { task: 'Inspect resident room safety', frequency: 'daily', compliance_related: true }
      ]
    },
    {
      category: 'Infection Control',
      items: [
        { task: 'Verify hand sanitizer availability', frequency: 'daily', compliance_related: true},
        { task: 'Check isolation precautions compliance', frequency: 'daily', compliance_related: true},
        { task: 'Review housekeeping standards', frequency: 'daily', compliance_related: true},
        { task: 'Monitor PPE supply and usage', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Resident Care Quality',
      items: [
        { task: 'Review resident care plans', frequency: 'daily', compliance_related: true},
        { task: 'Check medication administration accuracy', frequency: 'daily', compliance_related: true},
        { task: 'Monitor pain management protocols', frequency: 'daily', compliance_related: true},
        { task: 'Assess resident dignity and privacy', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Staffing & Operations',
      items: [
        { task: 'Verify adequate staffing levels', frequency: 'daily', compliance_related: true},
        { task: 'Review staff competency compliance', frequency: 'daily', compliance_related: true},
        { task: 'Check staff break coverage', frequency: 'daily', compliance_related: false},
        { task: 'Monitor overtime and scheduling', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Documentation & Compliance',
      items: [
        { task: 'Review incident reports and follow-ups', frequency: 'daily', compliance_related: true},
        { task: 'Check medical record completeness', frequency: 'daily', compliance_related: true},
        { task: 'Verify physician order implementation', frequency: 'daily', compliance_related: true},
        { task: 'Review quality indicator metrics', frequency: 'daily', compliance_related: true}
      ]
    }
  ],
  'charge_nurse': [
    {
      category: 'Patient Assessment',
      items: [
        { task: 'Review 24-hour report and concerns', frequency: 'daily', compliance_related: true},
        { task: 'Assess high-risk residents', frequency: 'daily', compliance_related: true},
        { task: 'Check residents with recent changes', frequency: 'daily', compliance_related: true},
        { task: 'Monitor pain assessment compliance', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Medication Management',
      items: [
        { task: 'Verify medication administration times', frequency: 'daily', compliance_related: true},
        { task: 'Check controlled substance records', frequency: 'daily', compliance_related: true},
        { task: 'Review PRN medication usage', frequency: 'daily', compliance_related: true},
        { task: 'Monitor medication storage compliance', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Staff Supervision',
      items: [
        { task: 'Monitor CNA task completion', frequency: 'daily', compliance_related: true},
        { task: 'Review delegation appropriateness', frequency: 'daily', compliance_related: true},
        { task: 'Check staff break scheduling', frequency: 'daily', compliance_related: false},
        { task: 'Address staff concerns or questions', frequency: 'daily', compliance_related: false}
      ]
    }
  ],
  'general_management': [
    {
      category: 'Operations Overview',
      items: [
        { task: 'Review daily census and occupancy', frequency: 'daily', compliance_related: true},
        { task: 'Check overall facility safety status', frequency: 'daily', compliance_related: true},
        { task: 'Review staffing adequacy across departments', frequency: 'daily', compliance_related: true},
        { task: 'Monitor facility-wide compliance issues', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Quality & Safety',
      items: [
        { task: 'Check incident report summary', frequency: 'daily', compliance_related: true},
        { task: 'Review infection control status', frequency: 'daily', compliance_related: true},
        { task: 'Monitor resident satisfaction concerns', frequency: 'daily', compliance_related: true},
        { task: 'Assess overall care quality indicators', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Administrative Tasks',
      items: [
        { task: 'Review department communications', frequency: 'daily', compliance_related: false},
        { task: 'Address urgent facility issues', frequency: 'daily', compliance_related: false},
        { task: 'Check regulatory updates and notices', frequency: 'daily', compliance_related: true},
        { task: 'Plan and prioritize upcoming tasks', frequency: 'daily', compliance_related: false}
      ]
    }
  ],
  'director_of_nursing': [
    {
      category: 'Quality & Compliance',
      items: [
        { task: 'Review quality indicator reports', frequency: 'daily', compliance_related: true},
        { task: 'Check regulatory compliance status', frequency: 'daily', compliance_related: true},
        { task: 'Review incident trend analysis', frequency: 'daily', compliance_related: true},
        { task: 'Monitor survey readiness status', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Staffing Management',
      items: [
        { task: 'Review staffing adequacy metrics', frequency: 'daily', compliance_related: true},
        { task: 'Check overtime and agency usage', frequency: 'daily', compliance_related: true},
        { task: 'Monitor staff training compliance', frequency: 'daily', compliance_related: true},
        { task: 'Address staffing concerns', frequency: 'daily', compliance_related: false}
      ]
    }
  ]
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for facility context
    const { data: profileData } = await supa
      .from("profiles")
      .select("facility_name, facility_state, role, full_name, facility_id")
      .eq("user_id", user.id)
      .single();

    let profile = profileData;
    if (!profile) {
      // Create a minimal profile if none exists
      profile = {
        facility_name: 'Default Facility',
        facility_state: 'Unknown',
        role: 'user',
        full_name: user.email?.split('@')[0] || 'User',
        facility_id: null
      };
    }

    const body = await req.json();
    const { 
      template_type = 'unit_manager',
      unit = 'General',
      shift = '7a-3p',
      custom_items = [],
      ai_customize = false,
      resident_acuity = 'medium',
      special_focus_areas = []
    } = body;

    let roundItems: RoundItem[] = [];

    // Get base template
    const baseTemplate = defaultRoundTemplates[template_type as keyof typeof defaultRoundTemplates];
    console.log(`Using template type: ${template_type}, found template:`, !!baseTemplate);
    
    if (baseTemplate) {
      baseTemplate.forEach((category, categoryIndex) => {
        category.items.forEach((item, itemIndex) => {
          roundItems.push({
            id: `${categoryIndex}-${itemIndex}`,
            category: category.category,
            ...item
          } as RoundItem);
        });
      });
    }
    
    console.log(`Base template items added: ${roundItems.length}`);

    // Add custom items
    custom_items.forEach((item: any, index: number) => {
      roundItems.push({
        id: `custom-${index}`,
        category: item.category || 'Custom',
        task: item.task,
        frequency: item.frequency || 'daily',
        compliance_related: item.compliance_related || false,
        notes: item.notes
      });
    });

    // AI customization if requested
    if (ai_customize && special_focus_areas.length > 0) {
      try {
        const aiCustomizations = await generateAICustomizations(
          template_type,
          unit,
          shift,
          resident_acuity,
          special_focus_areas,
          profile
        );
        
        aiCustomizations.forEach((item, index) => {
          roundItems.push({
            id: `ai-${index}`,
            category: item.category,
            task: item.task,
            frequency: item.frequency,
            compliance_related: item.compliance_related,
            notes: item.notes
          });
        });
      } catch (error) {
        console.error("AI customization failed:", error);
        // Continue without AI customizations
      }
    }

    console.log(`Final round items count: ${roundItems.length}`);

    // Ensure we have at least some items - add fallback if empty
    if (roundItems.length === 0) {
      console.log("No items found, adding fallback items");
      roundItems = [
        {
          id: 'fallback-1',
          category: 'Basic Rounds',
          task: 'Complete visual safety check of unit',
          frequency: 'daily',
          priority: 'high',
          compliance_related: true,
          estimated_minutes: 15,
          notes: 'Fallback task - ensure basic safety compliance'
        },
        {
          id: 'fallback-2',
          category: 'Basic Rounds',
          task: 'Review shift report and priorities',
          frequency: 'daily',
          priority: 'high',
          compliance_related: false,
          estimated_minutes: 10,
          notes: 'Fallback task - basic shift preparation'
        }
      ];
    }

    // Create daily round record
    const dailyRound: Omit<DailyRound, 'id' | 'created_at'> = {
      title: `${template_type.replace('_', ' ').toUpperCase()} Daily Rounds - ${unit} Unit`,
      unit,
      shift,
      created_by: user.id,
      items: roundItems,
      metadata: {
        facility_name: profile.facility_name,
        template_type
      }
    };

    // Save to database
    const recordToInsert = {
      ...dailyRound,
      facility_id: profile.facility_id || profile.facility_name || 'default_facility'
    };
    
    console.log("Attempting to save daily round:", JSON.stringify(recordToInsert, null, 2));
    
    // Save to knowledge_base table as a template document
    const { data: savedRound, error: saveError } = await supa
      .from("knowledge_base")
      .insert({
        facility_id: profile?.facility_id,
        facility_name: profile?.facility_name,
        state: profile?.facility_state,
        category: 'Facility Policy',
        title: recordToInsert.title,
        content: JSON.stringify(recordToInsert),
        source_url: null,
        last_updated: new Date().toISOString(),
        embedding: null, // No embedding needed for daily rounds
        metadata: {
          ...recordToInsert.metadata,
          content_type: 'daily_round_template',
          unit: recordToInsert.unit,
          shift: recordToInsert.shift,
          created_by: user.id,
          facility_id: profile?.facility_id,
          user_id: user.id,
          template_type: recordToInsert.metadata.template_type
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save daily round:", saveError);
      console.error("Record that failed:", JSON.stringify(recordToInsert, null, 2));
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to save daily round template: ${saveError.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Daily round generated successfully",
      round: {
        id: savedRound.id,
        ...dailyRound,
        created_at: savedRound.created_at
      },
      summary: {
        total_items: roundItems.length,
        compliance_items: roundItems.filter(item => item.compliance_related).length
      }
    });

  } catch (error: any) {
    console.error("Daily round generation error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate daily round" 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roundId = searchParams.get('id');

    if (roundId) {
      // Get specific round from knowledge_base
      const { data: round, error } = await supa
        .from("knowledge_base")
        .select("*")
        .eq("id", roundId)
        .single();

      if (error || !round || round.metadata?.content_type !== 'daily_round_template') {
        return NextResponse.json({ 
          ok: false, 
          error: "Daily round not found" 
        }, { status: 404 });
      }

      // Parse the daily round data from the stored content
      let roundData;
      try {
        roundData = JSON.parse(round.content);
      } catch (e) {
        roundData = round.metadata?.daily_round_data || round;
      }

      return NextResponse.json({
        ok: true,
        round: roundData
      });
    } else {
      // Get user's recent rounds from knowledge_base
      const { data: allRounds, error } = await supa
        .from("knowledge_base")
        .select("id, title, created_at, metadata, category")
        .eq("metadata->>content_type", "daily_round_template")
        .eq("metadata->>user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50); // Get more to filter by content type
      
      if (error) {
        return NextResponse.json({ 
          ok: false, 
          error: error.message 
        }, { status: 500 });
      }

      // Filter for daily round templates (already filtered by metadata)
      const rounds = allRounds?.filter(round => round.metadata?.content_type === 'daily_round_template').slice(0, 20) || [];

      // Transform the rounds data to match expected format
      const formattedRounds = rounds?.map(round => ({
        id: round.id,
        title: round.title,
        unit: round.metadata?.unit || 'General',
        shift: round.metadata?.shift || '7a-3p',
        created_at: round.created_at,
        metadata: round.metadata
      })) || [];

      return NextResponse.json({
        ok: true,
        rounds: formattedRounds
      });
    }

  } catch (error: any) {
    console.error("Get daily rounds error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to retrieve daily rounds" 
    }, { status: 500 });
  }
}

async function generateAICustomizations(
  templateType: string,
  unit: string,
  shift: string,
  residentAcuity: string,
  specialFocusAreas: string[],
  profile: any
): Promise<RoundItem[]> {
  const currentDate = new Date().toLocaleDateString();
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const systemPrompt = `You are a CMS compliance expert with comprehensive knowledge of 42 CFR Part 483 nursing home regulations, F-tags, and current healthcare standards. Generate dynamic, regulation-specific daily round checklist items that vary based on current conditions and requirements.

CONTEXT (${currentDate}):
- Role: ${templateType.replace('_', ' ')}
- Unit: ${unit} (${residentAcuity} acuity)
- Shift: ${shift}
- Facility: ${profile?.facility_name || 'Nursing facility'} in ${profile?.facility_state || 'Unknown state'}
- Focus Areas: ${specialFocusAreas.join(', ')}
- Current Period: ${currentMonth}

GENERATE 4-6 UNIQUE, SPECIFIC ITEMS that:
✅ Reference specific CMS F-tags and regulations
✅ Vary based on current date/season
✅ Address ${profile?.facility_state || 'state'}-specific requirements
✅ Reflect ${shift} shift priorities and ${residentAcuity} acuity needs
✅ Include emerging healthcare trends and recent CMS updates
✅ Go beyond standard generic tasks

REGULATORY FOCUS GUIDANCE:
${specialFocusAreas.map(area => {
  const regulations = {
    'Infection Control': 'F880 (Infection Prevention), CDC Guidelines, OSHA Bloodborne Standards - Focus on current outbreak prevention, seasonal flu protocols',
    'Fall Prevention': 'F689 (Quality of Care), F656 (Accident Prevention) - Include mobility assessments, environmental hazards, post-fall analysis',
    'Medication Safety': 'F758 (Pharmacy Services), F760 (Drug Regimen Review) - DEA compliance, controlled substance monitoring, timing accuracy',
    'Wound Care': 'F686 (Pressure Ulcer Prevention), F314 (Skin Integrity) - Include staging protocols, nutrition correlation, repositioning schedules',
    'Dementia Care': 'F692 (Dementia-Specific Requirements), F584 (Person-Centered Care) - Behavioral interventions, environment modifications',
    'End-of-Life Care': 'F707 (Life Safety), F583 (Advance Directives) - Comfort care protocols, family communication, hospice coordination',
    'Nutritional Support': 'F812 (Food Service), F692 (Nutrition) - Include hydration monitoring, therapeutic diets, swallowing assessments',
    'Mental Health': 'F740 (Mental Health Services), F744 (Psychotropic Medications) - Depression screening, social engagement, medication monitoring',
    'Physical Therapy': 'F679 (Rehabilitation Services) - Medicare Part A/B compliance, progress documentation, discharge planning',
    'Emergency Preparedness': 'F838 (Emergency Preparedness Plan) - Include seasonal preparedness, equipment checks, staff training verification',
    'Family Communication': 'F622 (Right to Information), F572 (Grievance Process) - Communication documentation, care plan updates'
  };
  return `${area}: ${regulations[area] || 'Relevant CMS quality measures and compliance requirements'}`;
}).join('\n')}

EXAMPLES OF DYNAMIC, REGULATION-SPECIFIC TASKS:
- "Audit F-880 hand hygiene compliance during medication pass, documenting staff adherence rates"
- "Verify F-689 fall risk reassessment completion for residents with condition changes in past 48 hours"
- "Review F-758 controlled substance administration logs for timing compliance and witness documentation"
- "Document F-686 pressure ulcer prevention interventions for high-risk residents per care plan requirements"

Return ONLY a JSON array with this format (NO priority or estimated_minutes fields):
[{
  "category": "Regulation-Specific Category",
  "task": "Detailed, F-tag referenced task with specific compliance requirements",
  "frequency": "daily",
  "compliance_related": true/false,
  "notes": "CMS regulation reference (e.g., 'F-tag F689', '42 CFR 483.12') and brief compliance context"
}]

Make each item unique, specific, and directly tied to current CMS compliance requirements.`;

  const userPrompt = `Generate 3-5 additional daily round items for:

Template Type: ${templateType}
Unit: ${unit}
Shift: ${shift}
Resident Acuity: ${residentAcuity}
Special Focus Areas: ${specialFocusAreas.join(', ')}
Facility: ${profile.facility_name} (${profile.facility_state})

Please provide specific, actionable items that complement standard daily rounds.`;

  const provider = providerFromEnv();
  const aiResponse = await provider.complete([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ], {
    temperature: 0.3,
    max_tokens: 1500
  });
  if (!aiResponse) return [];

  try {
    const aiItems = JSON.parse(aiResponse);
    return Array.isArray(aiItems) ? aiItems : [];
  } catch (parseError) {
    console.error("Failed to parse AI round customizations:", parseError);
    return [];
  }
}