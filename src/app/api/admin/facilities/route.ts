// API route for facility management
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - List all facilities
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

    const { data: facilities, error } = await supa
      .from('facilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ facilities: facilities || [] });
  } catch (error: any) {
    console.error('Facilities fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new facility
export async function POST(req: NextRequest) {
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

    const facilityData = await req.json();

    const { data: facility, error } = await supa
      .from('facilities')
      .insert([{
        ...facilityData,
        onboarded_by: user.id,
        onboarded_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'create_facility',
      entity_type: 'facility',
      entity_id: facility.id,
      description: `Created facility: ${facility.name}`,
      metadata: { facility_data: facilityData }
    });

    return NextResponse.json({ facility });
  } catch (error: any) {
    console.error('Facility creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update facility
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, ...updates } = await req.json();

    const { data: facility, error } = await supa
      .from('facilities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_facility',
      entity_type: 'facility',
      entity_id: id,
      description: `Updated facility: ${facility.name}`,
      changes: updates
    });

    return NextResponse.json({ facility });
  } catch (error: any) {
    console.error('Facility update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete facility
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Facility ID required' }, { status: 400 });
    }

    const { error } = await supa
      .from('facilities')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'delete_facility',
      entity_type: 'facility',
      entity_id: id,
      description: `Deleted facility`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Facility deletion error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
