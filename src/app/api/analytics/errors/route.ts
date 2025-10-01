import { NextRequest, NextResponse } from 'next/server';
import { getBrowserSupabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const error = await request.json();
    
    const supabase = getBrowserSupabase();

    // Store error in database
    const { error: dbError } = await supabase
      .from('error_logs')
      .insert({
        code: error.code,
        message: error.message,
        details: error.details,
        user_id: error.userId,
        facility_id: error.facilityId,
        url: error.url,
        user_agent: error.userAgent,
        created_at: error.timestamp
      });

    if (dbError) {
      console.error('Failed to store error:', dbError);
      return NextResponse.json({ error: 'Failed to store error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error analytics API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
