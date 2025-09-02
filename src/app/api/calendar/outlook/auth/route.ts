// Microsoft Outlook Calendar OAuth authentication endpoints
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { createOutlookCalendarService } from "@/lib/calendar/outlook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/outlook/auth
 * Generate Microsoft OAuth authorization URL
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

    // Check if user already has Outlook Calendar integration
    const { data: existingIntegration } = await supa
      .from('calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .single();

    if (existingIntegration?.is_active) {
      return NextResponse.json({ 
        ok: false, 
        error: "Outlook Calendar integration already exists and is active" 
      }, { status: 400 });
    }

    // Generate OAuth URL
    const outlookService = createOutlookCalendarService();
    const authUrl = await outlookService.getAuthUrl();

    return NextResponse.json({
      ok: true,
      authUrl,
      message: "Redirect user to this URL to authorize Outlook Calendar access"
    });

  } catch (error: any) {
    console.error("Outlook Calendar auth URL generation error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate auth URL" 
    }, { status: 500 });
  }
}

/**
 * POST /api/calendar/outlook/auth
 * Handle OAuth callback and store tokens
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
    const { code, displayName } = body;

    if (!code) {
      return NextResponse.json({ 
        ok: false, 
        error: "Authorization code is required" 
      }, { status: 400 });
    }

    // Exchange code for tokens
    const outlookService = createOutlookCalendarService();
    const tokens = await outlookService.getTokensFromCode(code);

    // Set access token and get user's calendar list to verify connection
    outlookService.setAccessToken(tokens.access_token);
    const calendars = await outlookService.getCalendarList();

    if (!calendars || calendars.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        error: "No calendars found. Please check your Outlook Calendar permissions." 
      }, { status: 400 });
    }

    // Store integration in database
    const { data: integration, error: integrationError } = await supa
      .from('calendar_integrations')
      .upsert({
        user_id: user.id,
        provider: 'outlook',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null,
        is_active: true,
        sync_enabled: true,
        display_name: displayName || 'Outlook Calendar',
        last_sync_status: 'pending'
      }, {
        onConflict: 'user_id,provider'
      })
      .select()
      .single();

    if (integrationError) {
      console.error("Database error:", integrationError);
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to save integration settings" 
      }, { status: 500 });
    }

    // Return success with calendar list
    return NextResponse.json({
      ok: true,
      integration: {
        id: integration.id,
        provider: integration.provider,
        displayName: integration.display_name,
        isActive: integration.is_active,
        syncEnabled: integration.sync_enabled
      },
      calendars: calendars.map(cal => ({
        id: cal.id,
        name: cal.name,
        isDefaultCalendar: cal.isDefaultCalendar,
        canEdit: cal.canEdit
      })),
      message: "Outlook Calendar connected successfully"
    });

  } catch (error: any) {
    console.error("Outlook Calendar OAuth callback error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to complete Outlook Calendar integration" 
    }, { status: 500 });
  }
}