// src/app/api/messages/[id]/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  return NextResponse.json({
    messages: [
      { id: 'm1', chatId: id, role: 'assistant', content: '👋 Mock message for this chat.' }
    ],
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  return NextResponse.json({ ok: true, chatId: id, received: body });
}
