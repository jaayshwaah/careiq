// src/app/api/chats/route.ts
export const runtime = 'nodejs'; // ✅ Force Node.js runtime on Vercel
export const dynamic = 'force-dynamic'; // Avoid static/edge compilation

import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server'; // adjust if path differs

export async function GET() {
  try {
    const supabase = createClientServer();

    // Example: get all chats for the current user (adjust query as needed)
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ chats: data ?? [] });
  } catch (err) {
    console.error('Error in GET /api/chats:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const supabase = createClientServer();

    // Example: insert a new chat record (adjust fields as needed)
    const { data, error } = await supabase
      .from('chats')
      .insert({
        title: body.title ?? 'Untitled Chat',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ chat: data });
  } catch (err) {
    console.error('Error in POST /api/chats:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
