// Real-time Data Synchronization API
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SyncJob {
  id: string;
  type: 'census' | 'staffing' | 'quality' | 'supply' | 'calendar';
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress: number;
  data?: any;
}

export async function POST(req: NextRequest) {
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

    const { syncType, facilityId, priority = 'medium', force = false } = await req.json();

    if (!syncType || !facilityId) {
      return NextResponse.json({ error: "syncType and facilityId are required" }, { status: 400 });
    }

    // Check if there's already a running sync of this type
    if (!force) {
      const { data: existingSync } = await supa
        .from("sync_jobs")
        .select("*")
        .eq("facility_id", facilityId)
        .eq("sync_type", syncType)
        .in("status", ["pending", "running"])
        .single();

      if (existingSync) {
        return NextResponse.json({ 
          error: "Sync already in progress", 
          jobId: existingSync.id 
        }, { status: 409 });
      }
    }

    // Create sync job
    const { data: job, error: jobError } = await supa
      .from("sync_jobs")
      .insert({
        facility_id: facilityId,
        sync_type: syncType,
        status: 'pending',
        priority,
        created_by: user.id,
        progress: 0
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json({ error: "Failed to create sync job" }, { status: 500 });
    }

    // Start sync process asynchronously
    processSyncJob(job.id, syncType, facilityId, user.id, supa);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Sync job started"
    });

  } catch (error) {
    console.error("Real-time sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const facilityId = searchParams.get('facilityId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supa
      .from("sync_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (facilityId) {
      query = query.eq("facility_id", facilityId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch sync jobs" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || []
    });

  } catch (error) {
    console.error("Get sync jobs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processSyncJob(jobId: string, syncType: string, facilityId: string, userId: string, supa: any) {
  try {
    // Update job status to running
    await supa
      .from("sync_jobs")
      .update({ 
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 10
      })
      .eq("id", jobId);

    let result;
    
    switch (syncType) {
      case 'census':
        result = await syncCensusData(facilityId, supa);
        break;
      case 'staffing':
        result = await syncStaffingData(facilityId, supa);
        break;
      case 'quality':
        result = await syncQualityData(facilityId, supa);
        break;
      case 'supply':
        result = await syncSupplyData(facilityId, supa);
        break;
      case 'calendar':
        result = await syncCalendarData(userId, supa);
        break;
      default:
        throw new Error(`Unknown sync type: ${syncType}`);
    }

    // Update job as completed
    await supa
      .from("sync_jobs")
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress: 100,
        result_data: result
      })
      .eq("id", jobId);

  } catch (error) {
    console.error(`Sync job ${jobId} failed:`, error);
    
    // Update job as failed
    await supa
      .from("sync_jobs")
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq("id", jobId);
  }
}

async function syncCensusData(facilityId: string, supa: any) {
  // Simulate census data sync
  const censusData = {
    totalBeds: 120,
    occupiedBeds: 95,
    occupancyRate: 79.2,
    admissions: 3,
    discharges: 2,
    timestamp: new Date().toISOString()
  };

  // Store census snapshot
  const { error } = await supa
    .from("census_snapshots")
    .insert({
      facility_id: facilityId,
      date: new Date().toISOString().split('T')[0],
      total_beds: censusData.totalBeds,
      occupied_beds: censusData.occupiedBeds,
      occupancy_rate: censusData.occupancyRate,
      admission_count: censusData.admissions,
      discharge_count: censusData.discharges,
      source: 'realtime_sync'
    });

  if (error) throw error;

  return censusData;
}

async function syncStaffingData(facilityId: string, supa: any) {
  // Simulate staffing data sync
  const staffingData = {
    rnCount: 8,
    lpnCount: 12,
    cnaCount: 24,
    totalStaff: 44,
    timestamp: new Date().toISOString()
  };

  // Store staffing data (assuming we have a staffing table)
  // This would be implemented based on your staffing schema

  return staffingData;
}

async function syncQualityData(facilityId: string, supa: any) {
  // Simulate quality data sync from CMS
  const qualityData = {
    starRating: 4.2,
    healthInspectionRating: 3.8,
    staffingRating: 4.5,
    qualityRating: 4.1,
    timestamp: new Date().toISOString()
  };

  // Store quality data
  const { error } = await supa
    .from("facility_quality_metrics")
    .insert({
      facility_id: facilityId,
      star_rating: qualityData.starRating,
      health_inspection_rating: qualityData.healthInspectionRating,
      staffing_rating: qualityData.staffingRating,
      quality_rating: qualityData.qualityRating,
      recorded_at: new Date().toISOString()
    });

  if (error) throw error;

  return qualityData;
}

async function syncSupplyData(facilityId: string, supa: any) {
  // Simulate supply data sync
  const supplyData = {
    lowStockItems: 5,
    outOfStockItems: 1,
    totalItems: 150,
    lastRestock: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };

  return supplyData;
}

async function syncCalendarData(userId: string, supa: any) {
  // Simulate calendar sync
  const calendarData = {
    eventsSynced: 12,
    conflictsResolved: 2,
    lastSync: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };

  return calendarData;
}