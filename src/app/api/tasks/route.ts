// Task Management API - NetSuite-like functionality
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
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assigned_to');
    const workflowId = searchParams.get('workflow_id');

    let query = supa
      .from('tasks')
      .select(`
        *,
        assigned_to_profile:profiles!tasks_assigned_to_fkey(full_name, email),
        assigned_by_profile:profiles!tasks_assigned_by_fkey(full_name),
        created_by_profile:profiles!tasks_created_by_fkey(full_name),
        workflow:task_workflows(name, description),
        template:task_templates(name, category),
        dependencies:task_dependencies(
          depends_on_task_id,
          dependency_task:tasks!task_dependencies_depends_on_task_id_fkey(title, status)
        ),
        comments:task_comments(
          id, comment_text, comment_type, created_at,
          created_by_profile:profiles!task_comments_created_by_fkey(full_name)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (workflowId) query = query.eq('workflow_id', workflowId);

    const { data: tasks, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });

  } catch (error: any) {
    console.error('Tasks API error:', error);
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
      title,
      description,
      priority = 'medium',
      category,
      assigned_to,
      due_date,
      template_id,
      workflow_id,
      parent_task_id,
      task_data = {},
      dependencies = []
    } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Create main task
    const { data: task, error: taskError } = await supa
      .from('tasks')
      .insert({
        title,
        description,
        priority,
        category,
        assigned_to,
        assigned_by: user.id,
        created_by: user.id,
        due_date,
        template_id,
        workflow_id,
        parent_task_id,
        task_data
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    // Create dependencies if provided
    if (dependencies.length > 0) {
      const dependencyInserts = dependencies.map((depTaskId: string) => ({
        task_id: task.id,
        depends_on_task_id: depTaskId
      }));

      const { error: depError } = await supa
        .from('task_dependencies')
        .insert(dependencyInserts);

      if (depError) {
        console.warn('Error creating task dependencies:', depError);
      }
    }

    // Add initial comment
    await supa
      .from('task_comments')
      .insert({
        task_id: task.id,
        comment_text: 'Task created',
        comment_type: 'system',
        created_by: user.id
      });

    return NextResponse.json({ task }, { status: 201 });

  } catch (error: any) {
    console.error('Create task error:', error);
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
      status,
      title,
      description,
      priority,
      assigned_to,
      due_date,
      completion_notes,
      checklist_progress,
      actual_duration_minutes
    } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (completion_notes !== undefined) updateData.completion_notes = completion_notes;
    if (checklist_progress !== undefined) updateData.checklist_progress = checklist_progress;
    if (actual_duration_minutes !== undefined) updateData.actual_duration_minutes = actual_duration_minutes;

    // Handle status changes
    if (status !== undefined) {
      updateData.status = status;
      
      if (status === 'in_progress' && !updateData.started_at) {
        updateData.started_at = new Date().toISOString();
      }
      
      if (status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
    }

    updateData.updated_at = new Date().toISOString();

    const { data: task, error } = await supa
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    // Add status change comment
    if (status !== undefined) {
      await supa
        .from('task_comments')
        .insert({
          task_id: id,
          comment_text: `Status changed to ${status}`,
          comment_type: 'status_change',
          created_by: user.id
        });
    }

    return NextResponse.json({ task });

  } catch (error: any) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
