import { NextResponse } from "next/server";
import supabaseDefault, { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const existsNamed = typeof supabaseAdmin !== "undefined";
  const existsDefault = typeof supabaseDefault !== "undefined";
  const hasFromNamed = existsNamed && typeof (supabaseAdmin as any)?.from === "function";
  const hasFromDefault = existsDefault && typeof (supabaseDefault as any)?.from === "function";

  const client = hasFromNamed ? supabaseAdmin : hasFromDefault ? (supabaseDefault as any) : undefined;

  if (!client) {
    return NextResponse.json(
      {
        ok: false,
        env: { hasUrl, hasServiceKey },
        module: { existsNamed, existsDefault, hasFromNamed, hasFromDefault },
        message: "Supabase client not constructed (export mismatch).",
      },
      { status: 500 }
    );
  }

  const { data, error } = await client.from("chat_sessions").select("id").limit(1);

  return NextResponse.json(
    {
      ok: !error,
      env: { hasUrl, hasServiceKey },
      module: { existsNamed, existsDefault, hasFromNamed, hasFromDefault },
      db: error ? { ok: false, message: error.message } : { ok: true, rows: data?.length ?? 0 },
    },
    { status: error ? 500 : 200 }
  );
}
