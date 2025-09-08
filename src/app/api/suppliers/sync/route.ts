// Supplier Sync API
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

    const { supplier_id, sync_type = 'incremental' } = await req.json();

    if (!supplier_id) {
      return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
    }

    // Check if supplier exists and is active
    const { data: supplier, error: supplierError } = await supa
      .from('suppliers')
      .select('*')
      .eq('id', supplier_id)
      .eq('is_active', true)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json({ error: "Supplier not found or inactive" }, { status: 404 });
    }

    // Check if sync is already in progress
    if (supplier.sync_status === 'syncing') {
      return NextResponse.json({ 
        error: "Sync already in progress for this supplier" 
      }, { status: 409 });
    }

    // Call the sync function
    const { data: syncResult, error: syncError } = await supa
      .rpc('sync_supplier_products', {
        supplier_id_param: supplier_id,
        sync_type_param: sync_type
      });

    if (syncError) {
      console.error('Error syncing supplier products:', syncError);
      return NextResponse.json({ 
        error: "Failed to sync supplier products",
        details: syncError.message 
      }, { status: 500 });
    }

    // Get updated sync log
    const { data: syncLog } = await supa
      .from('supplier_sync_logs')
      .select('*')
      .eq('id', syncResult)
      .single();

    return NextResponse.json({
      sync_log_id: syncResult,
      sync_log: syncLog,
      message: "Supplier sync completed successfully"
    });

  } catch (error: any) {
    console.error('Supplier sync error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

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
    const supplierId = searchParams.get('supplier_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supa
      .from('supplier_sync_logs')
      .select(`
        *,
        supplier:suppliers(name, contact_name)
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: syncLogs, error } = await query;

    if (error) {
      console.error('Error fetching sync logs:', error);
      return NextResponse.json({ error: "Failed to fetch sync logs" }, { status: 500 });
    }

    return NextResponse.json({ sync_logs: syncLogs || [] });

  } catch (error: any) {
    console.error('Sync logs API error:', error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
