// src/app/api/profile/route.ts - Updated to restrict user modifications
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

  const { data: user } = await supa.auth.getUser();
  if (!user?.user) return NextResponse.json({ ok: true, profile: null });

  // Use service role to bypass RLS
  const supaService = supabaseService();
  const { data, error } = await supaService
    .from("profiles")
    .select("role, facility_id, facility_name, facility_state, full_name, is_admin, email, approved_at")
    .eq("user_id", user.user.id)
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, profile: data });
}

export async function POST(req: NextRequest) {
  const { full_name } = await req.json();

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
  const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

  const { data: user } = await supa.auth.getUser();
  if (!user?.user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });

  // Use service role to bypass RLS
  const supaService = supabaseService();
  const { error } = await supaService
    .from("profiles")
    .update({
      full_name,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.user.id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}