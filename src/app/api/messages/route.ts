import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { conversationId, role, content } = await req.json();

  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select('id, created_at')
    .single();
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 });

  await supabase
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  return NextResponse.json(msg);
}
