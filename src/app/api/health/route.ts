export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET() {
  // Don’t throw during build; just report what we see.
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL;
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY;
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

  return NextResponse.json({
    ok: true,
    env: { hasUrl, hasAnon, hasOpenRouter },
  });
}
