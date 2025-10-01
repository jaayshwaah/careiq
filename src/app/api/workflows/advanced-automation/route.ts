// Advanced Workflow Automation API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

interface AdvancedWorkflowRequest {
  workflow_id: string;
  trigger_event: string;
  trigger_data: any;
  execution_context?: {
    facility_id: string;
    user_id: string;
    department: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
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
      workflow_id,
      trigger_event,
      trigger_data,
      execution_context
    }: AdvancedWorkflowRequest = await req.json();

    if (!workflow_id || !trigger_event) {
      return NextResponse.json({ error: "Workflow ID and trigger event are required" }, { status: 400 });
    }

    // Get workflow definition
    const { data: workflow, error: workflowError } = await supa
      .from('task_workflows')
      .select('*')
      .eq('id', workflow_id)
      .eq('is_active', true)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 404 });
    }

    // Execute advanced workflow
    const executionResult = await executeAdvancedWorkflow({
      workflow,
      trigger_event,
      trigger_data,
      execution_context: execution_context || { user_id: user.id },
      supa
    });

    return NextResponse.json({
      execution_result: executionResult,
      message: "Advanced workflow executed successfully"
    });

  } catch (error: any) {
    console.error('Advanced workflow execution error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function executeAdvancedWorkflow({
  workflow,
  trigger_event,
  trigger_data,
  execution_context,
  supa
}: {
  workflow: any;
  trigger_event: string;
  trigger_data: any;
  execution_context: any;
  supa: any;
}) {
  const workflowSteps = workflow.workflow_steps || [];
  const executionResults = [];
  const createdTasks = [];
  const notifications = [];

  try {
    // Create workflow execution record
    const { data: execution, error: executionError } = await supa
      .from('workflow_executions')
      .insert({
        workflow_id: workflow.id,
        trigger_event,
        trigger_data,
        execution_context,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (executionError) {
      throw new Error('Failed to create workflow execution record');
    }

    // Execute each step in the workflow
    for (let i = 0; i < workflowSteps.length; i++) {
      const step = workflowSteps[i];
      const stepResult = await executeWorkflowStep({
        step,
        stepIndex: i,
        triggerData: trigger_data,
        executionContext: execution_context,
        previousResults: executionResults,
        supa
      });

      executionResults.push(stepResult);

      // Handle step-specific actions
      if (step.type === 'create_task') {
        const taskResult = await createWorkflowTask({
          step,
          triggerData: trigger_data,
          executionContext: execution_context,
          supa
        });
        createdTasks.push(taskResult);
      } else if (step.type === 'send_notification') {
        const notificationResult = await sendWorkflowNotification({
          step,
          triggerData: trigger_data,
          executionContext: execution_context,
          supa
        });
        notifications.push(notificationResult);
      } else if (step.type === 'conditional') {
        // Handle conditional logic
        const conditionResult = await evaluateCondition({
          step,
          triggerData: trigger_data,
          executionContext: execution_context,
          previousResults: executionResults
        });
        
        if (!conditionResult.met) {
          // Skip remaining steps if condition not met
          break;
        }
      } else if (step.type === 'delay') {
        // Handle delay steps
        await handleWorkflowDelay(step);
      }
    }

    // Update execution status
    await supa
      .from('workflow_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        execution_results: executionResults,
        created_tasks: createdTasks,
        notifications_sent: notifications
      })
      .eq('id', execution.id);

    return {
      execution_id: execution.id,
      status: 'completed',
      steps_executed: executionResults.length,
      tasks_created: createdTasks.length,
      notifications_sent: notifications.length,
      results: executionResults
    };

  } catch (error) {
    console.error('Workflow execution error:', error);
    throw error;
  }
}

async function executeWorkflowStep({
  step,
  stepIndex,
  triggerData,
  executionContext,
  previousResults,
  supa
}: {
  step: any;
  stepIndex: number;
  triggerData: any;
  executionContext: any;
  previousResults: any[];
  supa: any;
}) {
  const stepStartTime = new Date().toISOString();

  try {
    // Execute step based on type
    let stepResult = {
      step_index: stepIndex,
      step_type: step.type,
      status: 'success',
      started_at: stepStartTime,
      completed_at: new Date().toISOString(),
      result_data: {}
    };

    switch (step.type) {
      case 'create_task':
        stepResult.result_data = await createWorkflowTask({
          step,
          triggerData,
          executionContext,
          supa
        });
        break;

      case 'send_notification':
        stepResult.result_data = await sendWorkflowNotification({
          step,
          triggerData,
          executionContext,
          supa
        });
        break;

      case 'update_data':
        stepResult.result_data = await updateWorkflowData({
          step,
          triggerData,
          executionContext,
          supa
        });
        break;

      case 'conditional':
        stepResult.result_data = await evaluateCondition({
          step,
          triggerData,
          executionContext,
          previousResults
        });
        break;

      case 'delay':
        stepResult.result_data = await handleWorkflowDelay(step);
        break;

      default:
        stepResult.status = 'skipped';
        stepResult.result_data = { message: 'Unknown step type' };
    }

    return stepResult;

  } catch (error) {
    return {
      step_index: stepIndex,
      step_type: step.type,
      status: 'error',
      started_at: stepStartTime,
      completed_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      result_data: {}
    };
  }
}

async function createWorkflowTask({
  step,
  triggerData,
  executionContext,
  supa
}: {
  step: any;
  triggerData: any;
  executionContext: any;
  supa: any;
}) {
  const taskData = {
    title: step.task_title || 'Workflow Generated Task',
    description: step.task_description || '',
    status: 'pending',
    priority: step.task_priority || 'medium',
    category: step.task_category || 'workflow',
    assigned_to: step.assigned_to || executionContext.user_id,
    created_by: executionContext.user_id,
    workflow_id: step.workflow_id,
    workflow_step_number: step.step_number,
    task_data: {
      trigger_data: triggerData,
      execution_context: executionContext,
      step_config: step
    }
  };

  const { data: task, error } = await supa
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return { task_id: task.id, task_title: task.title };
}

async function sendWorkflowNotification({
  step,
  triggerData,
  executionContext,
  supa
}: {
  step: any;
  triggerData: any;
  executionContext: any;
  supa: any;
}) {
  // Implementation for sending notifications
  // This could integrate with email, SMS, or in-app notifications
  return {
    notification_type: step.notification_type || 'email',
    recipients: step.recipients || [executionContext.user_id],
    message: step.message || 'Workflow notification',
    sent_at: new Date().toISOString()
  };
}

async function updateWorkflowData({
  step,
  triggerData,
  executionContext,
  supa
}: {
  step: any;
  triggerData: any;
  executionContext: any;
  supa: any;
}) {
  // Implementation for updating data based on workflow step
  return {
    table: step.table_name,
    operation: step.operation || 'update',
    records_affected: 0,
    updated_at: new Date().toISOString()
  };
}

async function evaluateCondition({
  step,
  triggerData,
  executionContext,
  previousResults
}: {
  step: any;
  triggerData: any;
  executionContext: any;
  previousResults: any[];
}) {
  // Simple condition evaluation
  // In a real implementation, this would be more sophisticated
  const condition = step.condition || {};
  let met = true;

  if (condition.field && condition.operator && condition.value) {
    const fieldValue = triggerData[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        met = fieldValue === condition.value;
        break;
      case 'greater_than':
        met = fieldValue > condition.value;
        break;
      case 'less_than':
        met = fieldValue < condition.value;
        break;
      case 'contains':
        met = fieldValue && fieldValue.includes(condition.value);
        break;
      default:
        met = true;
    }
  }

  return {
    condition_met: met,
    evaluated_at: new Date().toISOString(),
    condition_details: condition
  };
}

async function handleWorkflowDelay(step: any) {
  const delayMs = step.delay_seconds ? step.delay_seconds * 1000 : 1000;
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        delay_completed: true,
        delay_duration_ms: delayMs,
        completed_at: new Date().toISOString()
      });
    }, delayMs);
  });
}
