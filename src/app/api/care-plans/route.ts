// Care Plans API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.DEFAULT);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const residentId = searchParams.get('resident_id');
    const planType = searchParams.get('plan_type');

    let query = supa
      .from('care_plans')
      .select(`
        *,
        goals:care_goals(
          id, goal_text, target_date, status, priority, 
          progress_notes, interventions, created_at, updated_at
        ),
        progress:care_plan_progress(
          id, note_text, note_type, created_at,
          created_by_profile:profiles!care_plan_progress_created_by_fkey(full_name)
        )
      `)
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (residentId) {
      query = query.eq('resident_id', residentId);
    }
    if (planType) {
      query = query.eq('plan_type', planType);
    }

    const { data: carePlans, error } = await query;

    if (error) {
      console.error('Error fetching care plans:', error);
      return NextResponse.json({ error: "Failed to fetch care plans" }, { status: 500 });
    }

    return NextResponse.json({ care_plans: carePlans || [] });

  } catch (error: any) {
    console.error('Care plans API error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
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
      resident_id,
      resident_name,
      plan_type = 'comprehensive',
      diagnosis = [],
      medications = [],
      allergies = [],
      diet_restrictions = [],
      mobility_status,
      cognitive_status,
      next_review,
      goals = []
    } = await req.json();

    if (!resident_id || !resident_name) {
      return NextResponse.json({ error: "Resident ID and name are required" }, { status: 400 });
    }

    // Create care plan
    const { data: carePlan, error: planError } = await supa
      .from('care_plans')
      .insert({
        resident_id,
        resident_name,
        plan_type,
        diagnosis,
        medications,
        allergies,
        diet_restrictions,
        mobility_status,
        cognitive_status,
        next_review,
        created_by: user.id
      })
      .select()
      .single();

    if (planError) {
      console.error('Error creating care plan:', planError);
      return NextResponse.json({ error: "Failed to create care plan" }, { status: 500 });
    }

    // Create goals if provided
    if (goals.length > 0) {
      const goalsData = goals.map((goal: any) => ({
        care_plan_id: carePlan.id,
        goal_text: goal.goal_text,
        target_date: goal.target_date,
        priority: goal.priority || 'medium',
        interventions: goal.interventions || []
      }));

      const { error: goalsError } = await supa
        .from('care_goals')
        .insert(goalsData);

      if (goalsError) {
        console.error('Error creating care goals:', goalsError);
        // Don't fail the entire operation for goals
      }
    }

    return NextResponse.json({ care_plan: carePlan }, { status: 201 });

  } catch (error: any) {
    console.error('Create care plan error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
      id,
      resident_name,
      plan_type,
      diagnosis,
      medications,
      allergies,
      diet_restrictions,
      mobility_status,
      cognitive_status,
      status,
      next_review
    } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Care plan ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (resident_name !== undefined) updateData.resident_name = resident_name;
    if (plan_type !== undefined) updateData.plan_type = plan_type;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (medications !== undefined) updateData.medications = medications;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (diet_restrictions !== undefined) updateData.diet_restrictions = diet_restrictions;
    if (mobility_status !== undefined) updateData.mobility_status = mobility_status;
    if (cognitive_status !== undefined) updateData.cognitive_status = cognitive_status;
    if (status !== undefined) updateData.status = status;
    if (next_review !== undefined) updateData.next_review = next_review;

    updateData.updated_at = new Date().toISOString();

    const { data: carePlan, error } = await supa
      .from('care_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating care plan:', error);
      return NextResponse.json({ error: "Failed to update care plan" }, { status: 500 });
    }

    return NextResponse.json({ care_plan: carePlan });

  } catch (error: any) {
    console.error('Update care plan error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
