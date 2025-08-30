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
  priority: 'high' | 'medium' | 'low';
  compliance_related: boolean;
  estimated_minutes: number;
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
    estimated_total_time: number;
  };
}

const defaultRoundTemplates = {
  'unit_manager': [
    {
      category: 'Safety & Environment',
      items: [
        { task: 'Check emergency equipment functionality', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 15 },
        { task: 'Inspect call bell system operation', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 10 },
        { task: 'Verify fire safety equipment', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 10 },
        { task: 'Check hallway lighting and safety', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 15 },
        { task: 'Inspect resident room safety', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 30 }
      ]
    },
    {
      category: 'Infection Control',
      items: [
        { task: 'Verify hand sanitizer availability', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 10 },
        { task: 'Check isolation precautions compliance', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Review housekeeping standards', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 15 },
        { task: 'Monitor PPE supply and usage', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 10 }
      ]
    },
    {
      category: 'Resident Care Quality',
      items: [
        { task: 'Review resident care plans', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 45 },
        { task: 'Check medication administration accuracy', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 30 },
        { task: 'Monitor pain management protocols', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Assess resident dignity and privacy', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 25 }
      ]
    },
    {
      category: 'Staffing & Operations',
      items: [
        { task: 'Verify adequate staffing levels', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 15 },
        { task: 'Review staff competency compliance', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 20 },
        { task: 'Check staff break coverage', frequency: 'daily', priority: 'medium', compliance_related: false, estimated_minutes: 10 },
        { task: 'Monitor overtime and scheduling', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 15 }
      ]
    },
    {
      category: 'Documentation & Compliance',
      items: [
        { task: 'Review incident reports and follow-ups', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 30 },
        { task: 'Check medical record completeness', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 25 },
        { task: 'Verify physician order implementation', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Review quality indicator metrics', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 15 }
      ]
    }
  ],
  'charge_nurse': [
    {
      category: 'Patient Assessment',
      items: [
        { task: 'Review 24-hour report and concerns', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Assess high-risk residents', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 30 },
        { task: 'Check residents with recent changes', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 25 },
        { task: 'Monitor pain assessment compliance', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 15 }
      ]
    },
    {
      category: 'Medication Management',
      items: [
        { task: 'Verify medication administration times', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Check controlled substance records', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 15 },
        { task: 'Review PRN medication usage', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 15 },
        { task: 'Monitor medication storage compliance', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 10 }
      ]
    },
    {
      category: 'Staff Supervision',
      items: [
        { task: 'Monitor CNA task completion', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 25 },
        { task: 'Review delegation appropriateness', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 15 },
        { task: 'Check staff break scheduling', frequency: 'daily', priority: 'medium', compliance_related: false, estimated_minutes: 10 },
        { task: 'Address staff concerns or questions', frequency: 'daily', priority: 'medium', compliance_related: false, estimated_minutes: 20 }
      ]
    }
  ],
  'director_of_nursing': [
    {
      category: 'Quality & Compliance',
      items: [
        { task: 'Review quality indicator reports', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 30 },
        { task: 'Check regulatory compliance status', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 25 },
        { task: 'Review incident trend analysis', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Monitor survey readiness status', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 }
      ]
    },
    {
      category: 'Staffing Management',
      items: [
        { task: 'Review staffing adequacy metrics', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 15 },
        { task: 'Check overtime and agency usage', frequency: 'daily', priority: 'medium', compliance_related: true, estimated_minutes: 15 },
        { task: 'Monitor staff training compliance', frequency: 'daily', priority: 'high', compliance_related: true, estimated_minutes: 20 },
        { task: 'Address staffing concerns', frequency: 'daily', priority: 'high', compliance_related: false, estimated_minutes: 25 }
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
        priority: item.priority || 'medium',
        compliance_related: item.compliance_related || false,
        estimated_minutes: item.estimated_minutes || 10,
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
            priority: item.priority,
            compliance_related: item.compliance_related,
            estimated_minutes: item.estimated_minutes,
            notes: item.notes
          });
        });
      } catch (error) {
        console.error("AI customization failed:", error);
        // Continue without AI customizations
      }
    }

    // Calculate total estimated time
    const totalEstimatedMinutes = roundItems.reduce((sum, item) => sum + item.estimated_minutes, 0);
    
    console.log(`Final round items count: ${roundItems.length}, total minutes: ${totalEstimatedMinutes}`);

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
        template_type,
        estimated_total_time: totalEstimatedMinutes
      }
    };

    // Save to database
    const recordToInsert = {
      ...dailyRound,
      facility_id: profile.facility_id || profile.facility_name || 'default_facility'
    };
    
    console.log("Attempting to save daily round:", JSON.stringify(recordToInsert, null, 2));
    
    const { data: savedRound, error: saveError } = await supa
      .from("daily_rounds")
      .insert(recordToInsert)
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
        compliance_items: roundItems.filter(item => item.compliance_related).length,
        estimated_time_hours: Math.round(totalEstimatedMinutes / 60 * 10) / 10,
        estimated_time_minutes: totalEstimatedMinutes
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
      // Get specific round
      const { data: round, error } = await supa
        .from("daily_rounds")
        .select("*")
        .eq("id", roundId)
        .single();

      if (error || !round) {
        return NextResponse.json({ 
          ok: false, 
          error: "Daily round not found" 
        }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        round
      });
    } else {
      // Get user's recent rounds
      const { data: rounds, error } = await supa
        .from("daily_rounds")
        .select("id, title, unit, shift, created_at, metadata")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        return NextResponse.json({ 
          ok: false, 
          error: error.message 
        }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        rounds: rounds || []
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
  const systemPrompt = `You are CareIQ, an AI assistant specialized in nursing home operations and compliance. 
Generate additional daily round checklist items based on the specific needs and focus areas provided.

Consider:
- Regulatory requirements for nursing homes
- Best practices for ${templateType.replace('_', ' ')} role
- Unit-specific needs (${unit})
- Shift-specific considerations (${shift})
- Resident acuity level (${residentAcuity})
- Special focus areas: ${specialFocusAreas.join(', ')}
- State-specific requirements for ${profile.facility_state}

Return a JSON array of additional round items with this format:
[{
  "category": "Category Name",
  "task": "Specific task description",
  "frequency": "daily|hourly|every_2_hours|every_4_hours|every_8_hours|weekly",
  "priority": "high|medium|low",
  "compliance_related": true/false,
  "estimated_minutes": number,
  "notes": "Optional additional guidance"
}]

Focus on items that would be specific to the provided focus areas and wouldn't already be covered in a standard template.`;

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