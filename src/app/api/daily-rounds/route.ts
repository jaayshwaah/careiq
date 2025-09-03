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
      category: 'Safety & Environment (F-Tag 323)',
      items: [
        { task: 'Check call bells within reach from bed and wheelchair positions', frequency: 'daily', compliance_related: true },
        { task: 'Verify no personal items blocking egress paths or fire exits', frequency: 'daily', compliance_related: true },
        { task: 'Inspect for loose handrails, broken furniture, or trip hazards', frequency: 'daily', compliance_related: true },
        { task: 'Check that oxygen tanks are properly secured and away from heat sources', frequency: 'daily', compliance_related: true },
        { task: 'Verify emergency lighting works and exit signs are illuminated', frequency: 'daily', compliance_related: true },
        { task: 'Check that resident beds are at safe height with working locks', frequency: 'daily', compliance_related: true }
      ]
    },
    {
      category: 'Infection Control (F-Tag 441)',
      items: [
        { task: 'Observe staff removing gloves before leaving resident rooms', frequency: 'daily', compliance_related: true},
        { task: 'Check isolation room doors are closed with proper signage posted', frequency: 'daily', compliance_related: true},
        { task: 'Verify hand sanitizer dispensers are filled and functioning', frequency: 'daily', compliance_related: true},
        { task: 'Observe proper donning/doffing of PPE when entering isolation rooms', frequency: 'daily', compliance_related: true},
        { task: 'Check that soiled linens are bagged at point of origin, not in hallways', frequency: 'daily', compliance_related: true},
        { task: 'Verify sharps containers are not overfilled (3/4 full maximum)', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Resident Rights & Dignity (F-Tag 550-578)',
      items: [
        { task: 'Check that residents are dressed appropriately and not exposed', frequency: 'daily', compliance_related: true},
        { task: 'Verify room doors/curtains closed during personal care', frequency: 'daily', compliance_related: true},
        { task: 'Observe staff speaking respectfully and not discussing residents in public areas', frequency: 'daily', compliance_related: true},
        { task: 'Check residents have access to personal belongings and call bells', frequency: 'daily', compliance_related: true},
        { task: 'Verify residents are positioned with dignity (no slouching, proper alignment)', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Immediate Jeopardy Risks',
      items: [
        { task: 'Check no residents left unattended on toilets >15 minutes', frequency: 'every_2_hours', compliance_related: true},
        { task: 'Verify mechanical lifts have working emergency stops and monthly inspections', frequency: 'daily', compliance_related: true},
        { task: 'Check medication cart is locked when nurse leaves area', frequency: 'every_4_hours', compliance_related: true},
        { task: 'Verify elopement risk residents have proper monitoring/alarms', frequency: 'every_8_hours', compliance_related: true},
        { task: 'Check wound care supplies are sterile and within expiration dates', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Documentation & Care Planning (F-Tag 655-685)',
      items: [
        { task: 'Verify care plan interventions match current resident conditions', frequency: 'daily', compliance_related: true},
        { task: 'Check physician orders are signed and implemented within 24 hours', frequency: 'daily', compliance_related: true},
        { task: 'Verify incident reports filed within 24 hours with proper follow-up', frequency: 'daily', compliance_related: true},
        { task: 'Check ADL assessments match current resident functional status', frequency: 'daily', compliance_related: true}
      ]
    }
  ],
  'charge_nurse': [
    {
      category: 'Medication Safety (F-Tag 428)',
      items: [
        { task: 'Verify controlled substances double-locked and count matches records', frequency: 'every_8_hours', compliance_related: true},
        { task: 'Check PRN medications given with proper documentation of effectiveness', frequency: 'daily', compliance_related: true},
        { task: 'Observe medication cart locked when nurse away >10 feet', frequency: 'every_4_hours', compliance_related: true},
        { task: 'Verify refrigerated medications stored at 36-46°F with temp logs', frequency: 'daily', compliance_related: true},
        { task: 'Check no expired medications in active medication areas', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Resident Assessment & Care (F-Tag 636-655)',
      items: [
        { task: 'Check residents at risk for falls have proper interventions in place', frequency: 'daily', compliance_related: true},
        { task: 'Verify pain assessments done and documented per facility policy', frequency: 'daily', compliance_related: true},
        { task: 'Check pressure ulcer prevention for high-risk residents', frequency: 'daily', compliance_related: true},
        { task: 'Observe residents with feeding tubes for proper positioning', frequency: 'daily', compliance_related: true},
        { task: 'Verify restraint assessments current for residents with bed rails/restraints', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Staff Competency & Delegation (F-Tag 405)',
      items: [
        { task: 'Observe CNAs performing delegated nursing tasks correctly', frequency: 'daily', compliance_related: true},
        { task: 'Check that only qualified staff administer medications', frequency: 'daily', compliance_related: true},
        { task: 'Verify staff demonstrate proper infection control practices', frequency: 'daily', compliance_related: true},
        { task: 'Check that wound care only performed by licensed nurses', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Emergency Preparedness',
      items: [
        { task: 'Check crash cart sealed and within expiration dates', frequency: 'daily', compliance_related: true},
        { task: 'Verify oxygen concentrator/tanks functioning and secure', frequency: 'daily', compliance_related: true},
        { task: 'Check emergency medications available and not expired', frequency: 'daily', compliance_related: true},
        { task: 'Verify emergency contact numbers current and accessible', frequency: 'daily', compliance_related: true}
      ]
    }
  ],
  'general_management': [
    {
      category: 'Immediate Jeopardy Prevention (High Priority)',
      items: [
        { task: 'Ensure no residents left unattended on toilets or in bathrooms >15 minutes', frequency: 'daily', compliance_related: true},
        { task: 'Verify medication carts locked when nurses step away (>10 feet rule)', frequency: 'daily', compliance_related: true},
        { task: 'Check residents with elopement risk have functioning door alarms/monitoring', frequency: 'daily', compliance_related: true},
        { task: 'Verify mechanical lifts have current monthly inspection stickers and working emergency stops', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Surveyor Visual Inspections (F-Tag 323 & 570)',
      items: [
        { task: 'Walk common areas checking for residents left unattended in wheelchairs >30 minutes', frequency: 'daily', compliance_related: true},
        { task: 'Verify no personal items blocking fire exits or egress paths', frequency: 'daily', compliance_related: true},
        { task: 'Check room doors/privacy curtains closed during personal care activities', frequency: 'daily', compliance_related: true},
        { task: 'Verify call bells within resident reach from bed, wheelchair, and bathroom positions', frequency: 'daily', compliance_related: true}
      ]
    },
    {
      category: 'Staff Behavior & Documentation (F-Tag 636 & 880)',
      items: [
        { task: 'Listen for staff discussing resident information in public areas (elevators, hallways)', frequency: 'daily', compliance_related: true},
        { task: 'Watch staff remove gloves before leaving resident rooms and touching door handles', frequency: 'daily', compliance_related: true},
        { task: 'Spot-check that incident reports filed within 24 hours of occurrence', frequency: 'daily', compliance_related: true},
        { task: 'Check isolation room doors closed with proper signage posted and visible', frequency: 'daily', compliance_related: true}
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

    // Get user profile with error handling to avoid recursion
    let profile;
    try {
      const { data: profileData } = await supa
        .from("profiles")
        .select("facility_name, facility_state, role, full_name, facility_id")
        .eq("user_id", user.id)
        .single();
      
      profile = profileData || {
        facility_name: 'Default Facility',
        facility_state: 'Unknown',
        role: 'user',
        full_name: user.email?.split('@')[0] || 'User',
        facility_id: null
      };
    } catch (error) {
      console.log("Profiles query failed, using defaults:", error);
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
      template_type = 'general_management',
      unit = 'General',
      shift = '7a-3p',
      custom_items = [],
      ai_customize = false,
      resident_acuity = 'medium',
      special_focus_areas = []
    } = body;

    let roundItems: RoundItem[] = [];

    // Check if user wants AI-generated base items instead of template
    if (ai_customize && special_focus_areas.includes('Fresh Daily Items')) {
      console.log("Generating fresh AI-based daily round items...");
      try {
        const aiBaseItems = await generateFreshDailyItems(
          template_type,
          unit,
          shift,
          resident_acuity,
          profile
        );
        
        aiBaseItems.forEach((item, index) => {
          roundItems.push({
            id: `ai-base-${index}`,
            category: item.category,
            task: item.task,
            frequency: item.frequency,
            compliance_related: item.compliance_related,
            notes: item.notes
          });
        });
        
        console.log(`AI base items added: ${roundItems.length}`);
      } catch (error) {
        console.error("Fresh AI generation failed, using template fallback:", error);
        // Fall back to template if AI fails
        const baseTemplate = defaultRoundTemplates[template_type as keyof typeof defaultRoundTemplates];
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
      }
    } else {
      // Use standard template
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
    }

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

    // Ensure we have 8-12 items minimum
    if (roundItems.length < 8) {
      console.log(`Only ${roundItems.length} items found, adding more items to reach minimum of 8`);
      
      const additionalItems = [
        {
          id: 'min-1',
          category: 'Safety & Environment',
          task: 'Check call bells within reach from bed and wheelchair positions',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F323 - Accessibility requirement'
        },
        {
          id: 'min-2', 
          category: 'Infection Control',
          task: 'Observe staff removing gloves before leaving resident rooms',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F441 - Hand hygiene compliance'
        },
        {
          id: 'min-3',
          category: 'Medication Safety',
          task: 'Check medication carts locked when nurse steps away',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F428 - Medication security'
        },
        {
          id: 'min-4',
          category: 'Resident Rights',
          task: 'Verify room doors/curtains closed during personal care',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F573 - Privacy and dignity'
        },
        {
          id: 'min-5',
          category: 'Emergency Preparedness',
          task: 'Check no personal items blocking fire exits or egress paths',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F454 - Life safety code'
        },
        {
          id: 'min-6',
          category: 'Documentation',
          task: 'Verify incident reports filed within 24 hours with proper follow-up',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F636 - Quality assurance'
        },
        {
          id: 'min-7',
          category: 'Staff Competency',
          task: 'Observe CNAs performing delegated nursing tasks correctly',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F405 - Delegation requirements'
        },
        {
          id: 'min-8',
          category: 'Quality Measures',
          task: 'Check residents positioned with dignity and proper alignment',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F550 - Resident dignity'
        },
        {
          id: 'min-9',
          category: 'Environmental Safety',
          task: 'Inspect for loose handrails, broken furniture, or trip hazards',
          frequency: 'daily',
          compliance_related: true,
          notes: 'F-tag F323 - Environmental hazards'
        },
        {
          id: 'min-10',
          category: 'Immediate Jeopardy Prevention',
          task: 'Ensure no residents left unattended on toilets >15 minutes',
          frequency: 'daily',
          compliance_related: true,
          notes: 'Immediate jeopardy risk prevention'
        }
      ];
      
      // Add items until we reach at least 8
      while (roundItems.length < 8 && additionalItems.length > 0) {
        roundItems.push(additionalItems.shift()!);
      }
    }
    
    // Cap at 12 items maximum for manageable rounds
    if (roundItems.length > 12) {
      console.log(`Too many items (${roundItems.length}), limiting to 12`);
      roundItems = roundItems.slice(0, 12);
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
    
    // Save to database - using service role to bypass RLS
    let savedRound;
    try {
      const { data, error: saveError } = await supa
        .from("knowledge_base")
        .insert({
          facility_id: profile?.facility_id || null,
          facility_name: profile?.facility_name || 'Default Facility',
          state: profile?.facility_state || 'Unknown',
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
        // Don't fail the request, just use a temporary ID
        savedRound = {
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString()
        };
      } else {
        savedRound = data;
      }
    } catch (error) {
      console.error("Database save error:", error);
      // Fallback to temporary ID if save fails
      savedRound = {
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString()
      };
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

async function generateFreshDailyItems(
  templateType: string,
  unit: string, 
  shift: string,
  residentAcuity: string,
  profile: any
): Promise<RoundItem[]> {
  const currentDate = new Date().toLocaleDateString();
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  const systemPrompt = `You are a CMS survey expert and nursing home compliance specialist. Generate exactly 12 fresh, specific daily round inspection items that vary each day. These should be things surveyors actually observe and cite facilities for.

CONTEXT (${currentDate} - ${dayOfWeek}):
- Template: ${templateType.replace('_', ' ')}
- Unit: ${unit} (${residentAcuity} acuity)
- Shift: ${shift}
- Facility: ${profile?.facility_name || 'Nursing facility'} in ${profile?.facility_state || 'Unknown state'}
- Current Period: ${currentMonth}

GENERATE EXACTLY 12 SPECIFIC ITEMS focusing on:

🚨 IMMEDIATE JEOPARDY RISKS (3-4 items):
- Unattended residents in vulnerable positions
- Medication security violations
- Fall/injury prevention failures
- Emergency equipment/safety hazards

👀 OBSERVABLE SURVEYOR VIOLATIONS (4-5 items):
- Staff behavior regarding dignity/privacy
- Infection control practice failures
- Environmental safety hazards
- Equipment maintenance/positioning issues

📋 DOCUMENTATION & COMPLIANCE (3-4 items):
- Care plan implementation gaps
- Required reporting/assessment timing
- Regulatory posting/signage requirements
- Staff competency/delegation issues

REQUIREMENTS:
✅ Each item must be specific and observable (not "review policies")
✅ Reference F-tags when applicable (F-323, F-880, F-689, etc.)
✅ Vary based on current date/day of week
✅ Include time-specific elements (shift patterns, meal times, etc.)
✅ Be actionable for ${shift} shift priorities
✅ Address ${residentAcuity} acuity resident needs

EXAMPLES OF SPECIFIC SURVEYOR ITEMS:
- "Walk dining room during lunch - check no residents left unattended with food in mouth"
- "Observe nurses locking medication carts when stepping >10 feet away"
- "Check isolation room doors closed with proper CDC signage posted and visible"
- "Verify call bells within reach from bed, wheelchair, and toilet positions"
- "Watch for staff discussing resident information in elevators/hallways"

Return ONLY a JSON array with exactly 12 items in this format:
[{
  "category": "Survey Focus Area",
  "task": "Specific, observable task with compliance context",
  "frequency": "daily", 
  "compliance_related": true,
  "notes": "F-tag reference and brief compliance note"
}]`;

  const provider = providerFromEnv();
  const aiResponse = await provider.complete([
    { role: "system", content: systemPrompt }
  ], {
    temperature: 0.7, // Higher temperature for more variation
    max_tokens: 2000
  });

  if (!aiResponse) return [];

  try {
    const aiItems = JSON.parse(aiResponse);
    // Ensure we have exactly 12 items
    const validItems = Array.isArray(aiItems) ? aiItems.slice(0, 12) : [];
    return validItems.length === 12 ? validItems : [];
  } catch (parseError) {
    console.error("Failed to parse fresh daily items:", parseError);
    return [];
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

EXAMPLES OF SPECIFIC, CITATION-PREVENTIVE TASKS:
🚨 IMMEDIATE JEOPARDY SCENARIOS TO CHECK:
- "Observe: No residents left unattended on toilets >15 minutes (F-689 immediate jeopardy risk)"
- "Verify: Call bells within reach from bed, wheelchair, and toilet positions (F-323 accessibility)"
- "Check: Staff remove gloves before exiting resident rooms and entering hallways (F-880 infection control)"
- "Ensure: Medication carts locked when nurse moves >10 feet away (F-758 medication security)"
- "Confirm: Isolation room doors closed with proper signage posted and visible (F-880 transmission precautions)"

🔍 COMMON CITATION SCENARIOS TO MONITOR:
- "Verify: No personal belongings blocking fire exits or egress paths (F-454 life safety)"
- "Check: Residents properly dressed/covered during transport through public areas (F-573 dignity)"
- "Observe: Staff not discussing resident information in elevators, hallways, or nursing stations (F-573 privacy)"
- "Ensure: Sharps containers not overfilled (3/4 maximum per OSHA standards)"
- "Verify: Mechanical lifts have current monthly inspection tags and working emergency stops (F-323)"
- "Check: Oxygen tanks secured upright and away from heat sources/electrical equipment (F-323)"
- "Monitor: No residents with elopement risk left unattended near exits (F-323 security)"
- "Verify: Wound care supplies are sterile and within expiration dates (F-686 infection prevention)"

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