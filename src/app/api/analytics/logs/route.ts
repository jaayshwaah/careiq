import { NextRequest, NextResponse } from 'next/server';
import { getBrowserSupabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const logEntry = await request.json();
    
    const supabase = getBrowserSupabase();

    // Store log entry in database
    const { error: dbError } = await supabase
      .from('application_logs')
      .insert({
        level: logEntry.level,
        message: logEntry.message,
        context: logEntry.context,
        user_id: logEntry.userId,
        facility_id: logEntry.facilityId,
        metadata: logEntry.metadata,
        stack_trace: logEntry.stack,
        created_at: logEntry.timestamp
      });

    if (dbError) {
      console.error('Failed to store log entry:', dbError);
      return NextResponse.json({ error: 'Failed to store log' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log analytics API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
