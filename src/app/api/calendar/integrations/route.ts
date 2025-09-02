// Calendar integrations management endpoints
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/integrations
 * Get user's calendar integrations
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

    const { data: integrations, error } = await supa
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      integrations: integrations?.map(integration => ({
        id: integration.id,
        provider: integration.provider,
        displayName: integration.display_name,
        isActive: integration.is_active,
        syncEnabled: integration.sync_enabled,
        syncFrequency: integration.sync_frequency,
        lastSyncAt: integration.last_sync_at,
        lastSyncStatus: integration.last_sync_status,
        errorMessage: integration.error_message,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at
      })) || []
    });

  } catch (error: any) {
    console.error("Get calendar integrations error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to get calendar integrations" 
    }, { status: 500 });
  }
}

/**
 * PUT /api/calendar/integrations
 * Update a calendar integration
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
    const {
      id,
      displayName,
      isActive,
      syncEnabled,
      syncFrequency,
      caldavUrl,
      caldavUsername,
      caldavPassword
    } = body;

    if (!id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Integration ID is required" 
      }, { status: 400 });
    }

    const updateData: any = {};
    if (displayName !== undefined) updateData.display_name = displayName;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (syncEnabled !== undefined) updateData.sync_enabled = syncEnabled;
    if (syncFrequency !== undefined) updateData.sync_frequency = syncFrequency;
    if (caldavUrl !== undefined) updateData.caldav_url = caldavUrl;
    if (caldavUsername !== undefined) updateData.caldav_username = caldavUsername;
    if (caldavPassword !== undefined) updateData.caldav_password = caldavPassword;

    const { data: integration, error } = await supa
      .from('calendar_integrations')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!integration) {
      return NextResponse.json({ 
        ok: false, 
        error: "Integration not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        displayName: integration.display_name,
        isActive: integration.is_active,
        syncEnabled: integration.sync_enabled,
        syncFrequency: integration.sync_frequency,
        lastSyncAt: integration.last_sync_at,
        lastSyncStatus: integration.last_sync_status,
        errorMessage: integration.error_message,
        createdAt: integration.created_at,
        updatedAt: integration.updated_at
      },
      message: "Integration updated successfully"
    });

  } catch (error: any) {
    console.error("Update calendar integration error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to update calendar integration" 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/calendar/integrations
 * Delete a calendar integration
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Integration ID is required" 
      }, { status: 400 });
    }

    // Get integration details before deletion
    const { data: integration } = await supa
      .from('calendar_integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!integration) {
      return NextResponse.json({ 
        ok: false, 
        error: "Integration not found" 
      }, { status: 404 });
    }

    // Clear external event IDs from calendar_events
    const externalIdField = integration.provider === 'google' ? 'google_event_id' :
                           integration.provider === 'outlook' ? 'outlook_event_id' :
                           'apple_event_uid';

    await supa
      .from('calendar_events')
      .update({ 
        [externalIdField]: null,
        sync_status: 'pending'
      })
      .eq('user_id', user.id)
      .not(externalIdField, 'is', null);

    // Delete the integration
    const { error } = await supa
      .from('calendar_integrations')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Integration deleted successfully"
    });

  } catch (error: any) {
    console.error("Delete calendar integration error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to delete calendar integration" 
    }, { status: 500 });
  }
}