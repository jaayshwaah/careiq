// Billing & Invoices API
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServerWithAuth } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// GET - Fetch invoices
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
    const facilityId = searchParams.get('facility_id');
    const status = searchParams.get('status');

    let query = supa
      .from('invoices')
      .select('*, facilities(name)')
      .order('created_at', { ascending: false });

    if (facilityId) query = query.eq('facility_id', facilityId);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data: invoices, error } = await query;
    if (error) throw error;

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error: any) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create invoice
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || undefined;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceData = await req.json();

    const { data: invoice, error } = await supa
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'create_invoice',
      entity_type: 'invoice',
      entity_id: invoice.id,
      description: `Created invoice ${invoice.invoice_number}`,
      metadata: { amount: invoice.amount }
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update invoice
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

    // If marking as paid, add paid_at timestamp
    if (updates.status === 'paid' && !updates.paid_at) {
      updates.paid_at = new Date().toISOString();
    }

    const { data: invoice, error } = await supa
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log audit
    await supa.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_invoice',
      entity_type: 'invoice',
      entity_id: id,
      description: `Updated invoice ${invoice.invoice_number}`,
      changes: updates
    });

    return NextResponse.json({ invoice });
  } catch (error: any) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


