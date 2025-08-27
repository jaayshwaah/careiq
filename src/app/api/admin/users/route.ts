// src/app/api/admin/users/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    // Get all users via admin function
    const { data, error } = await supa.rpc('admin_list_users');
    
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, users: data || [] });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      target_user_id,
      role,
      facility_name,
      facility_state,
      full_name,
      email
    } = await req.json();

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    // Create/update profile via admin function
    const { data, error } = await supa.rpc('admin_create_profile', {
      target_user_id,
      user_role: role,
      user_facility_id: null, // Can be extended
      user_facility_name: facility_name,
      user_facility_state: facility_state,
      user_full_name: full_name,
      user_email: email,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile_id: data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}