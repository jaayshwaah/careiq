import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .select("id")
      .limit(1);

    return NextResponse.json({
      ok: !error,
      env: { hasUrl, hasServiceKey },
      db: error
        ? { ok: false, message: error.message }
        : { ok: true, rows: data?.length ?? 0 },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, env: { hasUrl, hasServiceKey }, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
