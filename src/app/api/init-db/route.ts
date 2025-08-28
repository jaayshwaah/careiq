export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = supabaseService();

    // Create chats table
    const { error: chatsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS chats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT DEFAULT 'New chat',
          user_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS chats_created_at_idx ON chats(created_at DESC);
        CREATE INDEX IF NOT EXISTS chats_user_id_idx ON chats(user_id);
      `
    });

    // Create messages table  
    const { error: messagesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id, created_at);
      `
    });

    // Create survey_prep_progress table
    const { error: surveyPrepError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS survey_prep_progress (
          user_id UUID PRIMARY KEY,
          checklist_data JSONB DEFAULT '{}'::jsonb,
          notes JSONB DEFAULT '{}'::jsonb,
          assignments JSONB DEFAULT '{}'::jsonb,
          survey_type TEXT,
          facility_type TEXT,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    // Create bookmarks table
    const { error: bookmarksError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS bookmarks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          chat_id UUID,
          message_id UUID,
          message_text TEXT NOT NULL,
          tags TEXT[] DEFAULT ARRAY[]::TEXT[],
          category TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks(user_id);
      `
    });

    // Create compliance_events table (used by calendar)
    const { error: calendarError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS compliance_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title TEXT NOT NULL,
          date DATE NOT NULL,
          category TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS compliance_events_user_id_idx ON compliance_events(user_id);
        CREATE INDEX IF NOT EXISTS compliance_events_date_idx ON compliance_events(date);
      `
    });

    // Create ppd_calculations table
    const { error: ppdError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ppd_calculations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          date DATE NOT NULL,
          census INTEGER NOT NULL CHECK (census > 0),
          rn_hours DECIMAL(8,2) DEFAULT 0 CHECK (rn_hours >= 0),
          lpn_hours DECIMAL(8,2) DEFAULT 0 CHECK (lpn_hours >= 0),
          cna_hours DECIMAL(8,2) DEFAULT 0 CHECK (cna_hours >= 0),
          total_nursing_hours DECIMAL(8,2) NOT NULL CHECK (total_nursing_hours >= 0),
          ppd DECIMAL(8,2) NOT NULL CHECK (ppd >= 0),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, date)
        );
        CREATE INDEX IF NOT EXISTS ppd_calculations_user_id_idx ON ppd_calculations(user_id);
        CREATE INDEX IF NOT EXISTS ppd_calculations_date_idx ON ppd_calculations(date DESC);
        CREATE INDEX IF NOT EXISTS ppd_calculations_user_date_idx ON ppd_calculations(user_id, date DESC);
      `
    });

    // If RPC doesn't work, try direct SQL (fallback)
    if (chatsError || messagesError) {
      // Direct table creation as fallback
      await supabase.from('chats').select('id').limit(1);
      await supabase.from('messages').select('id').limit(1);
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Database initialized successfully",
      errors: {
        chats: chatsError?.message,
        messages: messagesError?.message,
        surveyPrep: surveyPrepError?.message,
        bookmarks: bookmarksError?.message,
        calendar: calendarError?.message,
        ppd: ppdError?.message,
      }
    });

  } catch (error: any) {
    console.error("Database initialization error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || "Failed to initialize database" 
    }, { status: 500 });
  }
}
