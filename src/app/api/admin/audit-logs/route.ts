// Audit Logs API
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entity_type');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supa
      .from('audit_logs')
      .select('*, profiles(email, full_name)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);
    if (entityType) query = query.eq('entity_type', entityType);

    const { data: logs, error } = await query;
    if (error) throw error;

    return NextResponse.json({ logs: logs || [] });
  } catch (error: any) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create audit log (for manual logging)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logData = await req.json();

    const { data: log, error } = await supa
      .from('audit_logs')
      .insert([{ user_id: user.id, ...logData }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log });
  } catch (error: any) {
    console.error('Audit log creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


