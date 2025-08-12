// src/app/api/logout/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = createClientServer();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
