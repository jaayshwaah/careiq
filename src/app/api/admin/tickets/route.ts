// Support Tickets API
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - Fetch tickets
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let query = supa
      .from('support_tickets')
      .select('*, facilities(name), profiles!support_tickets_created_by_fkey(email, full_name), assigned_to_profile:profiles!support_tickets_assigned_to_fkey(email, full_name)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (priority && priority !== 'all') query = query.eq('priority', priority);

    const { data: tickets, error } = await query;
    if (error) throw error;

    return NextResponse.json({ tickets: tickets || [] });
  } catch (error: any) {
    console.error('Tickets fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create ticket
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketData = await req.json();

    const { data: ticket, error } = await supa
      .from('support_tickets')
      .insert([{ created_by: user.id, ...ticketData }])
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'create_ticket',
      entity_type: 'ticket',
      entity_id: ticket.id,
      description: `Created support ticket: ${ticket.title}`
    });

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Ticket creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update ticket
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

    // If closing ticket, add resolution timestamp
    if (updates.status === 'closed' && !updates.resolved_at) {
      updates.resolved_at = new Date().toISOString();
    }

    const { data: ticket, error } = await supa
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_ticket',
      entity_type: 'ticket',
      entity_id: id,
      description: `Updated support ticket: ${ticket.title}`,
      changes: updates
    });

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Ticket update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


