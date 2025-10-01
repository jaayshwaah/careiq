import { NextRequest, NextResponse } from 'next/server';
import { getBrowserSupabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, facilityId, metrics, timestamp, userAgent, url } = body;

    const supabase = getBrowserSupabase();

    // Store performance metrics in database
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        user_id: userId,
        facility_id: facilityId,
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        fcp: metrics.fcp,
        ttfb: metrics.ttfb,
        load_time: metrics.loadTime,
        memory_usage: metrics.memoryUsage,
        user_agent: userAgent,
        url: url,
        created_at: timestamp
      });

    if (error) {
      console.error('Failed to store performance metrics:', error);
      return NextResponse.json({ error: 'Failed to store metrics' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Performance metrics API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
