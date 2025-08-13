export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint. Use /api/chats." }, { status: 410 });
}
