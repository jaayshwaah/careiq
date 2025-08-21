export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

    const { data: user } = await supa.auth.getUser();
    if (!user?.user) return NextResponse.json({ ok: true, events: [] });

    const { data, error } = await supa
      .from("compliance_events")
      .select("id, title, date, category, notes")
      .eq("user_id", user.user.id)
      .order("date", { ascending: true });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, events: data || [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, date, category = null, notes = null } = await req.json();
    if (!title || !date) {
      return NextResponse.json({ ok: false, error: "title and date required" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

    const { data: profile, error: pErr } = await supa.auth.getUser();
    if (pErr || !profile?.user) {
      return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
    }

    const { error } = await supa.from("compliance_events").insert({
      user_id: profile.user.id,
      title,
      date,
      category,
      notes,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "internal error" }, { status: 500 });
  }
}
