// src/app/api/admin/routing-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getRoutingStats } from "@/lib/smartRouter";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // Check if user is admin
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supa
      .from('profiles')
      .select('is_admin, role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_admin && profile?.role !== 'Administrator') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get timeframe from query params
    const { searchParams } = new URL(req.url);
    const timeframe = (searchParams.get('timeframe') as 'day' | 'week' | 'month') || 'day';

    // Get routing stats
    const stats = await getRoutingStats(timeframe);
    
    if (!stats) {
      // Return empty stats if no data
      return NextResponse.json({
        totalCost: 0,
        modelUsage: {},
        taskTypes: {}
      });
    }

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching routing stats:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch routing stats' 
    }, { status: 500 });
  }
}