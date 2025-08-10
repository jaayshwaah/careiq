import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';

export async function POST() {
  const supabase = createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title: 'New chat' })
    .select('id, title, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
