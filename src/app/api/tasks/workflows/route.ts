// Task Workflows API - NetSuite-like automation
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

    const { data: workflows, error } = await supa
      .from('task_workflows')
      .select(`
        *,
        created_by_profile:profiles!task_workflows_created_by_fkey(full_name),
        executions:workflow_executions(id, status, started_at, completed_at, created_tasks)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
    }

    return NextResponse.json({ workflows: workflows || [] });

  } catch (error: any) {
    console.error('Workflows API error:', error);
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
      name,
      description,
      trigger_type = 'manual',
      trigger_conditions = {},
      workflow_steps = []
    } = await req.json();

    if (!name || !workflow_steps || workflow_steps.length === 0) {
      return NextResponse.json({ error: "Name and workflow steps are required" }, { status: 400 });
    }

    const { data: workflow, error } = await supa
      .from('task_workflows')
      .insert({
        name,
        description,
        trigger_type,
        trigger_conditions,
        workflow_steps,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow:', error);
      return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
    }

    return NextResponse.json({ workflow }, { status: 201 });

  } catch (error: any) {
    console.error('Create workflow error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
