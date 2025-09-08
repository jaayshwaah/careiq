// Execute Task Workflow API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

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
      workflow_id,
      trigger_data = {},
      context_data = {}
    } = await req.json();

    if (!workflow_id) {
      return NextResponse.json({ error: "Workflow ID is required" }, { status: 400 });
    }

    // Get workflow
    const { data: workflow, error: workflowError } = await supa
      .from('task_workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('is_active', true)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 404 });
    }

    // Create execution record
    const { data: execution, error: executionError } = await supa
      .from('workflow_executions')
      .insert({
        workflow_id: workflow.id,
        trigger_data,
        status: 'running',
        created_by: user.id
      })
      .select()
      .single();

    if (executionError) {
      console.error('Error creating workflow execution:', executionError);
      return NextResponse.json({ error: "Failed to create execution record" }, { status: 500 });
    }

    const createdTasks: string[] = [];
    const errors: string[] = [];

    try {
      // Execute workflow steps
      const steps = workflow.workflow_steps as any[];
      
      for (const step of steps) {
        try {
          if (step.step_type === 'create_task') {
            // Calculate due date
            let dueDate = null;
            if (step.due_offset_hours) {
              dueDate = new Date(Date.now() + (step.due_offset_hours * 60 * 60 * 1000)).toISOString();
            }

            // Get template if specified
            let templateData = null;
            if (step.template_name) {
              const { data: template } = await supa
                .from('task_templates')
                .select('*')
                .eq('name', step.template_name)
                .single();
              templateData = template;
            }

            // Determine assignment
            let assignedTo = null;
            if (step.assign_to_user_id) {
              assignedTo = step.assign_to_user_id;
            } else if (step.assign_to_role) {
              // In a real implementation, you'd have role-based assignment logic
              // For now, assign to the executing user
              assignedTo = user.id;
            }

            // Create the task
            const taskData = {
              title: step.title || templateData?.name || 'Workflow Task',
              description: step.description || templateData?.description || 'Auto-generated task from workflow',
              priority: step.priority || templateData?.default_priority || 'medium',
              category: step.category || templateData?.category || 'workflow',
              assigned_to: assignedTo,
              assigned_by: user.id,
              created_by: user.id,
              due_date: dueDate,
              workflow_id: workflow.id,
              workflow_step_number: step.step_number,
              template_id: templateData?.id,
              is_automated: true,
              auto_created: true,
              trigger_event: 'workflow_execution',
              task_data: {
                ...context_data,
                workflow_execution_id: execution.id,
                original_trigger: trigger_data
              }
            };

            const { data: task, error: taskError } = await supa
              .from('tasks')
              .insert(taskData)
              .select()
              .single();

            if (taskError) {
              errors.push(`Failed to create task for step ${step.step_number}: ${taskError.message}`);
              continue;
            }

            createdTasks.push(task.id);

            // Add initial comment
            await supa
              .from('task_comments')
              .insert({
                task_id: task.id,
                comment_text: `Task auto-created by workflow: ${workflow.name}`,
                comment_type: 'system',
                created_by: user.id
              });

            // Handle dependencies
            if (step.depends_on && step.depends_on.length > 0) {
              const dependencyInserts = step.depends_on.map((depStepNumber: number) => {
                // Find task created by previous step
                const dependentTaskId = createdTasks[depStepNumber - 1]; // Assuming step numbers start at 1
                return {
                  task_id: task.id,
                  depends_on_task_id: dependentTaskId
                };
              }).filter(dep => dep.depends_on_task_id); // Filter out any undefined dependencies

              if (dependencyInserts.length > 0) {
                await supa
                  .from('task_dependencies')
                  .insert(dependencyInserts);
              }
            }

          } else if (step.step_type === 'send_notification') {
            // Handle notification steps
            // This would integrate with your notification system
            console.log('Notification step:', step);
            
          } else if (step.step_type === 'conditional') {
            // Handle conditional logic
            // This would evaluate conditions and possibly skip subsequent steps
            console.log('Conditional step:', step);
            
          } else if (step.step_type === 'delay') {
            // Handle delay steps
            // In a real implementation, this would schedule the next steps for later
            console.log('Delay step:', step);
          }

        } catch (stepError: any) {
          console.error(`Error executing step ${step.step_number}:`, stepError);
          errors.push(`Step ${step.step_number}: ${stepError.message}`);
        }
      }

      // Update execution record
      const executionStatus = errors.length > 0 ? 'partial' : 'completed';
      await supa
        .from('workflow_executions')
        .update({
          status: executionStatus,
          completed_at: new Date().toISOString(),
          created_tasks: createdTasks,
          error_message: errors.length > 0 ? errors.join('; ') : null
        })
        .eq('id', execution.id);

      return NextResponse.json({
        execution_id: execution.id,
        status: executionStatus,
        created_tasks: createdTasks,
        errors: errors.length > 0 ? errors : null,
        message: `Workflow executed successfully. Created ${createdTasks.length} tasks.`
      });

    } catch (error: any) {
      // Mark execution as failed
      await supa
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          created_tasks: createdTasks
        })
        .eq('id', execution.id);

      throw error;
    }

  } catch (error: any) {
    console.error('Execute workflow error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
