// src/app/api/census/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'current';
    const days = parseInt(searchParams.get('days') || '30');

    if (type === 'current') {
      // Get most recent census snapshot
      const { data: current, error } = await supa
        .from('census_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        ok: true, 
        data: current || null 
      });
    }

    if (type === 'trends') {
      // Get census trends over time
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: snapshots, error } = await supa
        .from('census_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Calculate trends
      const trends = snapshots?.map(snapshot => ({
        date: snapshot.date,
        occupancy_rate: snapshot.occupancy_rate,
        total_revenue: calculateDailyRevenue(snapshot),
        admissions: snapshot.admission_count,
        discharges: snapshot.discharge_count,
        net_change: snapshot.admission_count - snapshot.discharge_count
      })) || [];

      return NextResponse.json({ 
        ok: true, 
        data: trends 
      });
    }

    if (type === 'analytics') {
      // Get comprehensive analytics
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: snapshots, error: snapshotError } = await supa
        .from('census_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      const { data: trends, error: trendError } = await supa
        .from('census_trends')
        .select('*')
        .eq('user_id', user.id)
        .gte('month', startDate.toISOString().slice(0, 7))
        .order('month', { ascending: true });

      if (snapshotError) {
        return NextResponse.json({ error: snapshotError.message }, { status: 500 });
      }

      if (trendError) {
        return NextResponse.json({ error: trendError.message }, { status: 500 });
      }

      const analytics = calculateAnalytics(snapshots || [], trends || []);

      return NextResponse.json({ 
        ok: true, 
        data: analytics 
      });
    }

    return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });

  } catch (error) {
    console.error("Census API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();
    const {
      date,
      total_beds,
      occupied_beds,
      admission_count = 0,
      discharge_count = 0,
      skilled_nursing_beds = 0,
      memory_care_beds = 0,
      assisted_living_beds = 0,
      private_pay_count = 0,
      medicare_count = 0,
      medicaid_count = 0,
      insurance_count = 0
    } = body;

    if (!date || !total_beds || occupied_beds === undefined) {
      return NextResponse.json({ 
        error: "date, total_beds, and occupied_beds are required" 
      }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const available_beds = total_beds - occupied_beds;
    const occupancy_rate = total_beds > 0 ? (occupied_beds / total_beds) * 100 : 0;

    const { data: snapshot, error } = await supa
      .from('census_snapshots')
      .upsert({
        user_id: user.id,
        date,
        total_beds,
        occupied_beds,
        available_beds,
        occupancy_rate,
        admission_count,
        discharge_count,
        skilled_nursing_beds,
        memory_care_beds,
        assisted_living_beds,
        private_pay_count,
        medicare_count,
        medicaid_count,
        insurance_count,
        source: 'manual',
        sync_status: 'success'
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      data: snapshot 
    });

  } catch (error) {
    console.error("Census creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions
function calculateDailyRevenue(snapshot: any): number {
  const rates = {
    medicare: 450,
    medicaid: 320,
    private_pay: 380,
    insurance: 400
  };

  return (
    (snapshot.medicare_count || 0) * rates.medicare +
    (snapshot.medicaid_count || 0) * rates.medicaid +
    (snapshot.private_pay_count || 0) * rates.private_pay +
    (snapshot.insurance_count || 0) * rates.insurance
  );
}

function calculateAnalytics(snapshots: any[], trends: any[]) {
  if (snapshots.length === 0) {
    return {
      current_occupancy: 0,
      occupancy_trend: 'stable',
      avg_occupancy: 0,
      total_admissions: 0,
      total_discharges: 0,
      avg_length_of_stay: 0,
      projected_monthly_revenue: 0,
      occupancy_variance: 0
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : latest;
  
  const avgOccupancy = snapshots.reduce((sum, s) => sum + s.occupancy_rate, 0) / snapshots.length;
  const totalAdmissions = snapshots.reduce((sum, s) => sum + (s.admission_count || 0), 0);
  const totalDischarges = snapshots.reduce((sum, s) => sum + (s.discharge_count || 0), 0);
  
  let occupancyTrend = 'stable';
  if (latest.occupancy_rate > previous.occupancy_rate + 2) occupancyTrend = 'up';
  else if (latest.occupancy_rate < previous.occupancy_rate - 2) occupancyTrend = 'down';

  const dailyRevenue = calculateDailyRevenue(latest);
  const projectedMonthlyRevenue = dailyRevenue * 30;

  // Calculate occupancy variance
  const variance = snapshots.reduce((sum, s) => {
    return sum + Math.pow(s.occupancy_rate - avgOccupancy, 2);
  }, 0) / snapshots.length;

  const avgLengthOfStay = trends.length > 0 
    ? trends[trends.length - 1].avg_length_of_stay || 0 
    : 0;

  return {
    current_occupancy: latest.occupancy_rate,
    occupancy_trend: occupancyTrend,
    avg_occupancy: avgOccupancy,
    total_admissions: totalAdmissions,
    total_discharges: totalDischarges,
    avg_length_of_stay: avgLengthOfStay,
    projected_monthly_revenue: projectedMonthlyRevenue,
    occupancy_variance: Math.sqrt(variance)
  };
}