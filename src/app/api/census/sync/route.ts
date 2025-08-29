// API endpoint to manually trigger census sync
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { CensusIntegrationService } from "@/lib/integrations/ehr-integrations";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supa
      .from("profiles")
      .select("role, facility_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Check if user has admin/manager permissions
    if (!profile.role?.includes('administrator') && !profile.role?.includes('manager')) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { facilityId } = await req.json().catch(() => ({}));
    const integrationService = new CensusIntegrationService();

    let success: boolean;
    if (facilityId) {
      // Sync specific facility
      success = await integrationService.syncFacility(facilityId);
    } else if (profile.facility_id) {
      // Sync user's facility
      success = await integrationService.syncFacility(profile.facility_id);
    } else {
      return NextResponse.json({ error: "No facility specified" }, { status: 400 });
    }

    return NextResponse.json({
      success,
      message: success ? "Census data synced successfully" : "Failed to sync census data"
    });

  } catch (error) {
    console.error("Census sync API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.DEFAULT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ error: "No facility associated" }, { status: 400 });
    }

    // Get latest census data
    const { data: censusData, error } = await supa
      .from("census_snapshots")
      .select("*")
      .eq("facility_id", profile.facility_id)
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get sync logs
    const { data: syncLogs } = await supa
      .from("census_sync_logs")
      .select("*")
      .eq("facility_id", profile.facility_id)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      censusData: censusData || [],
      syncLogs: syncLogs || [],
      lastSync: syncLogs?.[0]?.created_at || null
    });

  } catch (error) {
    console.error("Census data API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}