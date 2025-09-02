// Google Calendar sync operations
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";
import { createGoogleCalendarService, careiqToGoogleEvent, googleToCareiqEvent } from "@/lib/calendar/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/calendar/google/sync
 * Sync events between CareIQ and Google Calendar
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);
    const serviceSupabase = supabaseService();

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { direction = 'push', calendarTypeId, googleCalendarId } = body;

    // Get user's Google Calendar integration
    const { data: integration, error: integrationError } = await supa
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ 
        ok: false, 
        error: "Google Calendar integration not found or inactive" 
      }, { status: 400 });
    }

    // Initialize Google Calendar service
    const googleService = createGoogleCalendarService();
    
    // Check if tokens need refresh
    let tokens = {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expires_at: integration.expires_at ? new Date(integration.expires_at).getTime() : undefined
    };

    if (tokens.expires_at && tokens.expires_at <= Date.now()) {
      if (!tokens.refresh_token) {
        return NextResponse.json({ 
          ok: false, 
          error: "Access token expired and no refresh token available. Please re-authenticate." 
        }, { status: 401 });
      }

      // Refresh tokens
      tokens = await googleService.refreshAccessToken(tokens.refresh_token);
      
      // Update tokens in database
      await supa
        .from('calendar_integrations')
        .update({
          access_token: tokens.access_token,
          expires_at: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null
        })
        .eq('id', integration.id);
    }

    googleService.setCredentials(tokens);

    // Start sync log
    const syncLogData = {
      user_id: user.id,
      integration_id: integration.id,
      sync_type: 'manual',
      sync_direction: direction,
      status: 'in_progress',
      started_at: new Date().toISOString()
    };

    const { data: syncLog } = await serviceSupabase
      .from('calendar_sync_logs')
      .insert(syncLogData)
      .select()
      .single();

    const startTime = Date.now();
    let eventsProcessed = 0;
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventsDeleted = 0;
    let errorMessage = null;

    try {
      if (direction === 'push' || direction === 'bidirectional') {
        // Push CareIQ events to Google Calendar
        const { data: careiqEvents, error: eventsError } = await supa
          .from('calendar_events')
          .select('*')
          .eq('user_id', user.id)
          .is('google_event_id', null) // Only unsent events
          .eq('sync_status', 'pending');

        if (eventsError) {
          throw new Error(`Failed to fetch CareIQ events: ${eventsError.message}`);
        }

        for (const event of careiqEvents || []) {
          try {
            const googleEvent = careiqToGoogleEvent(event);
            const result = await googleService.createEvent(
              googleCalendarId || 'primary',
              googleEvent
            );

            // Update CareIQ event with Google event ID
            await supa
              .from('calendar_events')
              .update({
                google_event_id: result.id,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString()
              })
              .eq('id', event.id);

            eventsCreated++;
          } catch (eventError: any) {
            console.error(`Failed to sync event ${event.id}:`, eventError);
            
            // Mark event as error
            await supa
              .from('calendar_events')
              .update({
                sync_status: 'error',
                sync_error: eventError.message
              })
              .eq('id', event.id);
          }
          eventsProcessed++;
        }
      }

      if (direction === 'pull' || direction === 'bidirectional') {
        // Pull events from Google Calendar to CareIQ
        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1); // Get events from last month
        
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 6); // Get events up to 6 months ahead

        const googleEvents = await googleService.getEvents(
          googleCalendarId || 'primary',
          {
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            maxResults: 500,
            singleEvents: true
          }
        );

        for (const googleEvent of googleEvents || []) {
          try {
            // Check if event already exists
            const { data: existingEvent } = await supa
              .from('calendar_events')
              .select('id')
              .eq('google_event_id', googleEvent.id)
              .single();

            const careiqEvent = googleToCareiqEvent(googleEvent, user.id, calendarTypeId);

            if (existingEvent) {
              // Update existing event
              await supa
                .from('calendar_events')
                .update({
                  ...careiqEvent,
                  last_synced_at: new Date().toISOString()
                })
                .eq('id', existingEvent.id);
              eventsUpdated++;
            } else {
              // Create new event
              await supa
                .from('calendar_events')
                .insert({
                  ...careiqEvent,
                  last_synced_at: new Date().toISOString()
                });
              eventsCreated++;
            }
          } catch (eventError: any) {
            console.error(`Failed to import Google event ${googleEvent.id}:`, eventError);
          }
          eventsProcessed++;
        }
      }

      // Update sync log with success
      const executionTime = Date.now() - startTime;
      await serviceSupabase
        .from('calendar_sync_logs')
        .update({
          status: 'success',
          events_processed: eventsProcessed,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
          events_deleted: eventsDeleted,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      // Update integration last sync
      await supa
        .from('calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success'
        })
        .eq('id', integration.id);

      return NextResponse.json({
        ok: true,
        syncResults: {
          direction,
          eventsProcessed,
          eventsCreated,
          eventsUpdated,
          eventsDeleted,
          executionTimeMs: Date.now() - startTime
        },
        message: "Sync completed successfully"
      });

    } catch (syncError: any) {
      errorMessage = syncError.message;
      
      // Update sync log with error
      const executionTime = Date.now() - startTime;
      await serviceSupabase
        .from('calendar_sync_logs')
        .update({
          status: 'error',
          events_processed: eventsProcessed,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
          events_deleted: eventsDeleted,
          execution_time_ms: executionTime,
          error_message: errorMessage,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog?.id);

      // Update integration last sync
      await supa
        .from('calendar_integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          error_message: errorMessage
        })
        .eq('id', integration.id);

      throw syncError;
    }

  } catch (error: any) {
    console.error("Google Calendar sync error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to sync with Google Calendar" 
    }, { status: 500 });
  }
}

/**
 * GET /api/calendar/google/sync
 * Get sync status and recent sync logs
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

    // Get integration status
    const { data: integration } = await supa
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    // Get recent sync logs
    const { data: syncLogs } = await supa
      .from('calendar_sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_id', integration?.id)
      .order('started_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      ok: true,
      integration: integration ? {
        id: integration.id,
        isActive: integration.is_active,
        syncEnabled: integration.sync_enabled,
        lastSyncAt: integration.last_sync_at,
        lastSyncStatus: integration.last_sync_status,
        errorMessage: integration.error_message
      } : null,
      recentSyncs: syncLogs?.map(log => ({
        id: log.id,
        syncType: log.sync_type,
        syncDirection: log.sync_direction,
        status: log.status,
        eventsProcessed: log.events_processed,
        eventsCreated: log.events_created,
        eventsUpdated: log.events_updated,
        executionTimeMs: log.execution_time_ms,
        startedAt: log.started_at,
        completedAt: log.completed_at,
        errorMessage: log.error_message
      })) || []
    });

  } catch (error: any) {
    console.error("Get Google Calendar sync status error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to get sync status" 
    }, { status: 500 });
  }
}