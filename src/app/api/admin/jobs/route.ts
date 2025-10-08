// Scheduled Jobs API
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - Fetch jobs and executions
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin - use user_id, not id
    const { data: profile } = await supa
      .from('profiles')
      .select('is_admin, role, email')
      .eq('user_id', user.id)
      .single();

    const isAdmin = profile?.is_admin || 
                    String(profile?.role || '').toLowerCase().includes('administrator') ||
                    profile?.email?.endsWith('@careiq.com') ||
                    profile?.email === 'jking4600@gmail.com';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('job_id');

    // Fetch jobs
    let jobsQuery = supa
      .from('scheduled_jobs')
      .select('*')
      .order('name', { ascending: true });

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError) throw jobsError;

    // Fetch recent executions
    let executionsQuery = supa
      .from('job_executions')
      .select('*, scheduled_jobs(name)')
      .order('started_at', { ascending: false })
      .limit(100);

    if (jobId) executionsQuery = executionsQuery.eq('job_id', jobId);

    const { data: executions, error: executionsError } = await executionsQuery;
    if (executionsError) throw executionsError;

    return NextResponse.json({ 
      jobs: jobs || [],
      executions: executions || []
    });
  } catch (error: any) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Trigger job manually
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    // Get job details
    const { data: job, error: jobError } = await supa
      .from('scheduled_jobs')
      .select('*')
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!job.enabled) {
      return NextResponse.json({ error: 'Job is disabled' }, { status: 400 });
    }

    // Create execution record
    const { data: execution, error: execError } = await supa
      .from('job_executions')
      .insert([{
        job_id,
        status: 'running',
        started_at: new Date().toISOString(),
        triggered_by: 'manual'
      }])
      .select()
      .single();

    if (execError) throw execError;

    // In a real implementation, you would trigger the actual job here
    // For now, we'll just simulate it
    setTimeout(async () => {
      await supa
        .from('job_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          result: { message: 'Job executed successfully (simulated)' }
        })
        .eq('id', execution.id);
    }, 2000);

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'trigger_job',
      entity_type: 'job',
      entity_id: job_id,
      description: `Manually triggered job: ${job.name}`
    });

    return NextResponse.json({ execution, message: 'Job triggered successfully' });
  } catch (error: any) {
    console.error('Job trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update job (enable/disable)
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, enabled } = await req.json();

    const { data: job, error } = await supa
      .from('scheduled_jobs')
      .update({ enabled })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_job',
      entity_type: 'job',
      entity_id: id,
      description: `${enabled ? 'Enabled' : 'Disabled'} job: ${job.name}`
    });

    return NextResponse.json({ job });
  } catch (error: any) {
    console.error('Job update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


