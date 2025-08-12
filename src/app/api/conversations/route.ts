// src/app/api/conversations/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = createClientServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) {
      return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title: string = body?.title || "New chat";

    const { data, error } = await supabase
      .from("conversations")
      .insert([{ title, user_id: user.id }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, conversation: data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
