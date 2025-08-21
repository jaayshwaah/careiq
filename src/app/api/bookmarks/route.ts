export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { message, chat_id = null, tags = [] } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = token ? supabaseServerWithAuth(token) : supabaseServerWithAuth();

    const { data: profile, error: pErr } = await supa.auth.getUser();
    if (pErr || !profile?.user) {
      return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
    }

    const { error } = await supa.from("bookmarks").insert({
      user_id: profile.user.id,
      chat_id,
      message_text: message,
      tags,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "internal error" }, { status: 500 });
  }
}
