export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

// Legacy endpoint — no longer used. Keep a safe stub so builds don’t import Supabase at module init.
export async function GET() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint. Use /api/chats and /api/chat." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint. Use /api/chat." }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint." }, { status: 410 });
}
