export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

export async function POST() {
  const supabase = createClientServer();
  const title = "New chat";

  const { data, error } = await supabase
    .from("chats")
    .insert({ title })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...data });
}

export async function GET() {
  const supabase = createClientServer();
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}
