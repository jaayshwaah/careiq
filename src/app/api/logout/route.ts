export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  // No-op placeholder so builds don’t import envs.
  return NextResponse.json({ ok: true });
}
