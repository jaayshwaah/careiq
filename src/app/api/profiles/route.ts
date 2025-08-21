export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

  const { data: user } = await supa.auth.getUser();
  if (!user?.user) return NextResponse.json({ ok: true, profile: null });

  const { data, error } = await supa
    .from("profiles")
    .select("role, facility_id, facility_name, facility_state")
    .eq("user_id", user.user.id)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

export async function POST(req: NextRequest) {
  const { role = null, facility_id = null, facility_name = null, facility_state = null } =
    await req.json();

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

  const { data: user } = await supa.auth.getUser();
  if (!user?.user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });

  const { error } = await supa
    .from("profiles")
    .upsert(
      {
        user_id: user.user.id,
        role,
        facility_id,
        facility_name,
        facility_state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
