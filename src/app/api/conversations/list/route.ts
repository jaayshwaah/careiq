// src/app/api/conversations/list/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createClientServer();

    // Get user session (optional but typical)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ ok: true, conversations: [] });
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, conversations: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
