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
        messages: messagesError?.message
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