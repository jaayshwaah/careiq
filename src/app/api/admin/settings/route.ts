// Admin Settings API
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - Fetch settings
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
    const category = searchParams.get('category');

    let query = supa
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true });

    if (category) query = query.eq('category', category);

    const { data: settings, error } = await query;
    if (error) throw error;

    return NextResponse.json({ settings: settings || [] });
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update setting
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key, value } = await req.json();

    const { data: setting, error } = await supa
      .from('system_settings')
      .update({ value, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_setting',
      entity_type: 'setting',
      entity_id: setting.id,
      description: `Updated system setting: ${key}`,
      changes: { value }
    });

    return NextResponse.json({ setting });
  } catch (error: any) {
    console.error('Setting update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
