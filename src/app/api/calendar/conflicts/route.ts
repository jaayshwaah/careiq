// Calendar sync conflict resolution endpoints
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/conflicts
 * Get user's calendar sync conflicts
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supa
      .from('calendar_sync_conflicts')
      .select(`
        *,
        calendar_events!inner(id, title, start_time, end_time, category),
        calendar_integrations!inner(provider, display_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status !== 'all') {
      query = query.eq('resolution_status', status);
    }

    const { data: conflicts, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      conflicts: conflicts?.map(conflict => ({
        id: conflict.id,
        conflictType: conflict.conflict_type,
        localData: conflict.local_data,
        externalData: conflict.external_data,
        resolutionStatus: conflict.resolution_status,
        resolvedAt: conflict.resolved_at,
        resolvedBy: conflict.resolved_by,
        createdAt: conflict.created_at,
        event: conflict.calendar_events,
        integration: conflict.calendar_integrations
      })) || []
    });

  } catch (error: any) {
    console.error("Get calendar conflicts error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to get calendar conflicts" 
    }, { status: 500 });
  }
}

/**
 * POST /api/calendar/conflicts
 * Resolve a calendar sync conflict
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conflictId, resolution, resolvedData } = body;

    if (!conflictId || !resolution) {
      return NextResponse.json({ 
        ok: false, 
        error: "Conflict ID and resolution are required" 
      }, { status: 400 });
    }

    const validResolutions = ['resolved_local', 'resolved_external', 'resolved_manual', 'ignored'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid resolution type" 
      }, { status: 400 });
    }

    // Get the conflict details
    const { data: conflict, error: conflictError } = await supa
      .from('calendar_sync_conflicts')
      .select('*, calendar_events!inner(*)')
      .eq('id', conflictId)
      .eq('user_id', user.id)
      .single();

    if (conflictError || !conflict) {
      return NextResponse.json({ 
        ok: false, 
        error: "Conflict not found" 
      }, { status: 404 });
    }

    if (conflict.resolution_status !== 'pending') {
      return NextResponse.json({ 
        ok: false, 
        error: "Conflict has already been resolved" 
      }, { status: 400 });
    }

    // Apply the resolution
    if (resolution === 'resolved_local') {
      // Keep local data, mark as synced
      await supa
        .from('calendar_events')
        .update({
          sync_status: 'synced',
          last_synced_at: new Date().toISOString()
        })
        .eq('id', conflict.event_id);
    } else if (resolution === 'resolved_external') {
      // Use external data
      if (conflict.external_data) {
        await supa
          .from('calendar_events')
          .update({
            ...conflict.external_data,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString()
          })
          .eq('id', conflict.event_id);
      }
    } else if (resolution === 'resolved_manual') {
      // Use manually provided data
      if (resolvedData) {
        await supa
          .from('calendar_events')
          .update({
            ...resolvedData,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString()
          })
          .eq('id', conflict.event_id);
      }
    } else if (resolution === 'ignored') {
      // Mark event sync status as ignored
      await supa
        .from('calendar_events')
        .update({
          sync_status: 'error',
          sync_error: 'Conflict ignored by user'
        })
        .eq('id', conflict.event_id);
    }

    // Mark conflict as resolved
    const { error: updateError } = await supa
      .from('calendar_sync_conflicts')
      .update({
        resolution_status: resolution,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      })
      .eq('id', conflictId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Conflict resolved successfully"
    });

  } catch (error: any) {
    console.error("Resolve calendar conflict error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to resolve calendar conflict" 
    }, { status: 500 });
  }
}

/**
 * PUT /api/calendar/conflicts/batch
 * Resolve multiple calendar sync conflicts at once
 */
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conflictIds, resolution } = body;

    if (!Array.isArray(conflictIds) || conflictIds.length === 0 || !resolution) {
      return NextResponse.json({ 
        ok: false, 
        error: "Conflict IDs array and resolution are required" 
      }, { status: 400 });
    }

    const validResolutions = ['resolved_local', 'resolved_external', 'ignored'];
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid resolution type for batch operation" 
      }, { status: 400 });
    }

    let resolvedCount = 0;
    const errors: string[] = [];

    // Process each conflict
    for (const conflictId of conflictIds) {
      try {
        // Get the conflict details
        const { data: conflict, error: conflictError } = await supa
          .from('calendar_sync_conflicts')
          .select('*, calendar_events!inner(*)')
          .eq('id', conflictId)
          .eq('user_id', user.id)
          .eq('resolution_status', 'pending')
          .single();

        if (conflictError || !conflict) {
          errors.push(`Conflict ${conflictId} not found or already resolved`);
          continue;
        }

        // Apply the resolution
        if (resolution === 'resolved_local') {
          await supa
            .from('calendar_events')
            .update({
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            })
            .eq('id', conflict.event_id);
        } else if (resolution === 'resolved_external') {
          if (conflict.external_data) {
            await supa
              .from('calendar_events')
              .update({
                ...conflict.external_data,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString()
              })
              .eq('id', conflict.event_id);
          }
        } else if (resolution === 'ignored') {
          await supa
            .from('calendar_events')
            .update({
              sync_status: 'error',
              sync_error: 'Conflict ignored by user'
            })
            .eq('id', conflict.event_id);
        }

        // Mark conflict as resolved
        await supa
          .from('calendar_sync_conflicts')
          .update({
            resolution_status: resolution,
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
          })
          .eq('id', conflictId);

        resolvedCount++;

      } catch (error: any) {
        errors.push(`Failed to resolve conflict ${conflictId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      resolvedCount,
      totalRequested: conflictIds.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Resolved ${resolvedCount} of ${conflictIds.length} conflicts`
    });

  } catch (error: any) {
    console.error("Batch resolve calendar conflicts error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to resolve calendar conflicts" 
    }, { status: 500 });
  }
}