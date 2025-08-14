export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = createClientServer();
    const { data, error } = await supabase
      .from("chats")
      .insert({ title: "New chat" })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
