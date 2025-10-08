// API route for error logs management
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - List error logs with filtering
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
    const severity = searchParams.get('severity');
    const errorType = searchParams.get('error_type');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supa
      .from('error_logs')
      .select('*, profiles!error_logs_user_id_fkey(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }
    if (errorType && errorType !== 'all') {
      query = query.eq('error_type', errorType);
    }
    if (resolved !== null && resolved !== 'all') {
      query = query.eq('resolved', resolved === 'true');
    }

    const { data: logs, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({ logs: logs || [], total: count || 0 });
  } catch (error: any) {
    console.error('Error logs fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Log a new error
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const errorData = await req.json();

    // Generate error hash for grouping
    const errorHash = require('crypto')
      .createHash('md5')
      .update(`${errorData.error_type}-${errorData.message}-${errorData.endpoint}`)
      .digest('hex');

    // Check if this error already exists (for grouping)
    const { data: existingError } = await supa
      .from('error_logs')
      .select('id, occurrence_count')
      .eq('error_hash', errorHash)
      .eq('resolved', false)
      .single();

    if (existingError) {
      // Update existing error
      const { data, error } = await supa
        .from('error_logs')
        .update({
          occurrence_count: existingError.occurrence_count + 1,
          last_occurred_at: new Date().toISOString()
        })
        .eq('id', existingError.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ log: data });
    } else {
      // Create new error log
      const { data, error } = await supa
        .from('error_logs')
        .insert([{
          ...errorData,
          error_hash: errorHash,
          first_occurred_at: new Date().toISOString(),
          last_occurred_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ log: data });
    }
  } catch (error: any) {
    console.error('Error log creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Mark error as resolved
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, resolution_notes } = await req.json();

    const { data, error } = await supa
      .from('error_logs')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
        resolution_notes
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'resolve_error',
      entity_type: 'error_log',
      entity_id: id,
      description: `Resolved error: ${data.message}`,
      metadata: { resolution_notes }
    });

    return NextResponse.json({ log: data });
  } catch (error: any) {
    console.error('Error resolution error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete error logs (bulk)
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids')?.split(',') || [];
    const deleteResolved = searchParams.get('delete_resolved') === 'true';

    if (deleteResolved) {
      // Delete all resolved errors older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supa
        .from('error_logs')
        .delete()
        .eq('resolved', true)
        .lt('resolved_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
    } else if (ids.length > 0) {
      // Delete specific errors
      const { error } = await supa
        .from('error_logs')
        .delete()
        .in('id', ids);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


