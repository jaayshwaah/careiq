// Calendar types management endpoints
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/types
 * Get user's calendar types
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

    const { data: calendarTypes, error } = await supa
      .from('calendar_types')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      calendarTypes: calendarTypes?.map(type => ({
        id: type.id,
        name: type.name,
        description: type.description,
        category: type.category,
        color: type.color,
        syncToExternal: type.sync_to_external,
        syncFromExternal: type.sync_from_external,
        googleCalendarId: type.google_calendar_id,
        outlookCalendarId: type.outlook_calendar_id,
        appleCalendarName: type.apple_calendar_name,
        createdAt: type.created_at,
        updatedAt: type.updated_at
      })) || []
    });

  } catch (error: any) {
    console.error("Get calendar types error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to get calendar types" 
    }, { status: 500 });
  }
}

/**
 * POST /api/calendar/types
 * Create a new calendar type
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
    const {
      name,
      description,
      category,
      color = '#3B82F6',
      syncToExternal = true,
      syncFromExternal = false,
      googleCalendarId,
      outlookCalendarId,
      appleCalendarName
    } = body;

    if (!name || !category) {
      return NextResponse.json({ 
        ok: false, 
        error: "Name and category are required" 
      }, { status: 400 });
    }

    const validCategories = ['care_plan', 'daily_rounds', 'appointments', 'compliance', 'training', 'meetings', 'custom'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid category" 
      }, { status: 400 });
    }

    const { data: calendarType, error } = await supa
      .from('calendar_types')
      .insert({
        user_id: user.id,
        name,
        description,
        category,
        color,
        sync_to_external: syncToExternal,
        sync_from_external: syncFromExternal,
        google_calendar_id: googleCalendarId,
        outlook_calendar_id: outlookCalendarId,
        apple_calendar_name: appleCalendarName
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      calendarType: {
        id: calendarType.id,
        name: calendarType.name,
        description: calendarType.description,
        category: calendarType.category,
        color: calendarType.color,
        syncToExternal: calendarType.sync_to_external,
        syncFromExternal: calendarType.sync_from_external,
        googleCalendarId: calendarType.google_calendar_id,
        outlookCalendarId: calendarType.outlook_calendar_id,
        appleCalendarName: calendarType.apple_calendar_name,
        createdAt: calendarType.created_at,
        updatedAt: calendarType.updated_at
      },
      message: "Calendar type created successfully"
    });

  } catch (error: any) {
    console.error("Create calendar type error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to create calendar type" 
    }, { status: 500 });
  }
}

/**
 * PUT /api/calendar/types
 * Update a calendar type
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
      name,
      description,
      color,
      syncToExternal,
      syncFromExternal,
      googleCalendarId,
      outlookCalendarId,
      appleCalendarName
    } = body;

    if (!id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Calendar type ID is required" 
      }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (syncToExternal !== undefined) updateData.sync_to_external = syncToExternal;
    if (syncFromExternal !== undefined) updateData.sync_from_external = syncFromExternal;
    if (googleCalendarId !== undefined) updateData.google_calendar_id = googleCalendarId;
    if (outlookCalendarId !== undefined) updateData.outlook_calendar_id = outlookCalendarId;
    if (appleCalendarName !== undefined) updateData.apple_calendar_name = appleCalendarName;

    const { data: calendarType, error } = await supa
      .from('calendar_types')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!calendarType) {
      return NextResponse.json({ 
        ok: false, 
        error: "Calendar type not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      calendarType: {
        id: calendarType.id,
        name: calendarType.name,
        description: calendarType.description,
        category: calendarType.category,
        color: calendarType.color,
        syncToExternal: calendarType.sync_to_external,
        syncFromExternal: calendarType.sync_from_external,
        googleCalendarId: calendarType.google_calendar_id,
        outlookCalendarId: calendarType.outlook_calendar_id,
        appleCalendarName: calendarType.apple_calendar_name,
        createdAt: calendarType.created_at,
        updatedAt: calendarType.updated_at
      },
      message: "Calendar type updated successfully"
    });

  } catch (error: any) {
    console.error("Update calendar type error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to update calendar type" 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/calendar/types
 * Delete a calendar type
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
        error: "Calendar type ID is required" 
      }, { status: 400 });
    }

    // Check if there are events associated with this calendar type
    const { data: events, error: eventsError } = await supa
      .from('calendar_events')
      .select('id')
      .eq('calendar_type_id', id)
      .limit(1);

    if (eventsError) {
      return NextResponse.json({ ok: false, error: eventsError.message }, { status: 500 });
    }

    if (events && events.length > 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "Cannot delete calendar type with associated events. Please reassign or delete the events first." 
      }, { status: 400 });
    }

    const { error } = await supa
      .from('calendar_types')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Calendar type deleted successfully"
    });

  } catch (error: any) {
    console.error("Delete calendar type error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to delete calendar type" 
    }, { status: 500 });
  }
}