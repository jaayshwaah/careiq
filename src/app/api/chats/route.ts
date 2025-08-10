// src/app/api/chats/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  // Mock list of chats
  return NextResponse.json({
    chats: [
      { id: 'c1', title: 'Welcome to CareIQ', created_at: new Date().toISOString() },
    ],
  });
}

export async function POST(req: Request) {
  // Create a mock chat
  const body = await req.json().catch(() => ({}));
  const title = body?.title || 'Untitled Chat';
  return NextResponse.json({
    chat: {
      id: Math.random().toString(36).slice(2),
      title,
      created_at: new Date().toISOString(),
    },
  });
}
