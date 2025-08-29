// API endpoint to manage EHR integrations
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { EHRIntegrationFactory } from "@/lib/integrations/ehr-integrations";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

// Get integration settings
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

    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ error: "No facility associated" }, { status: 400 });
    }

    // Check permissions
    if (!profile.role?.includes('administrator') && !profile.role?.includes('manager')) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { data: integration, error } = await supa
      .from("ehr_integrations")
      .select(`
        id,
        ehr_system,
        api_endpoint,
        username,
        client_id,
        is_active,
        sync_frequency,
        sync_time,
        last_sync_at,
        last_sync_status
      `)
      .eq("facility_id", profile.facility_id)
      .single();

    return NextResponse.json({
      integration: integration || null,
      supportedSystems: [
        { id: 'pointclickcare', name: 'PointClickCare', status: 'supported' },
        { id: 'matrixcare', name: 'MatrixCare', status: 'coming_soon' },
        { id: 'caremerge', name: 'CareGiver/CareMerge', status: 'coming_soon' },
        { id: 'manual', name: 'Manual Entry', status: 'supported' }
      ]
    });

  } catch (error) {
    console.error("Get integration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Create/Update integration
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ error: "No facility associated" }, { status: 400 });
    }

    if (!profile.role?.includes('administrator') && !profile.role?.includes('manager')) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const {
      ehrSystem,
      apiEndpoint,
      username,
      password,
      clientId,
      clientSecret,
      apiKey,
      syncFrequency,
      syncTime,
      testConnection
    } = await req.json();

    // Validate required fields
    if (!ehrSystem) {
      return NextResponse.json({ error: "EHR system is required" }, { status: 400 });
    }

    // Test connection if requested
    if (testConnection && ehrSystem !== 'manual') {
      try {
        const integration = EHRIntegrationFactory.create({
          id: 'test',
          facilityId: profile.facility_id,
          ehrSystem,
          apiEndpoint,
          username,
          password,
          clientId,
          clientSecret,
          apiKey
        });

        const isValid = await integration.validateConnection();
        if (!isValid) {
          return NextResponse.json({ 
            error: "Connection test failed. Please check your credentials." 
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ 
          error: "Connection test failed: " + (error instanceof Error ? error.message : 'Unknown error')
        }, { status: 400 });
      }
    }

    // Encrypt sensitive data (in production, use proper encryption)
    const integrationData = {
      facility_id: profile.facility_id,
      ehr_system: ehrSystem,
      api_endpoint: apiEndpoint,
      username: username,
      password_encrypted: password, // Should be encrypted
      client_id: clientId,
      client_secret_encrypted: clientSecret, // Should be encrypted
      api_key_encrypted: apiKey, // Should be encrypted
      sync_frequency: syncFrequency || 'daily',
      sync_time: syncTime || '06:00:00',
      is_active: true
    };

    // Upsert integration
    const { data: integration, error } = await supa
      .from("ehr_integrations")
      .upsert(integrationData, {
        onConflict: 'facility_id,ehr_system',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Integration saved successfully",
      integration: {
        id: integration.id,
        ehrSystem: integration.ehr_system,
        isActive: integration.is_active
      }
    });

  } catch (error) {
    console.error("Create integration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete integration
export async function DELETE(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.ADMIN);
    if (rateLimitResponse) return rateLimitResponse;

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ error: "No facility associated" }, { status: 400 });
    }

    if (!profile.role?.includes('administrator')) {
      return NextResponse.json({ error: "Only administrators can delete integrations" }, { status: 403 });
    }

    const { error } = await supa
      .from("ehr_integrations")
      .delete()
      .eq("facility_id", profile.facility_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Integration deleted successfully"
    });

  } catch (error) {
    console.error("Delete integration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}