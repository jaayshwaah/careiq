export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint." }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ ok: false, error: "Legacy endpoint." }, { status: 410 });
}
