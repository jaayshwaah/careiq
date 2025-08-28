// src/app/api/title/route.ts - resilient chat titling
import { NextRequest, NextResponse } from "next/server";
import { generateTitle } from "@/lib/titler";
import { supabaseService } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { chatId, userText, assistantText } = await req.json();
    if (!chatId || !userText || !assistantText) {
      return NextResponse.json({ ok: false, error: "chatId, userText, assistantText required" }, { status: 400 });
    }

    let title = "New Chat";
    try {
      title = await generateTitle({ userText, assistantText, timeoutMs: 2000 });
    } catch {}

    // Persist to chats table (best-effort)
    try {
      const supa = supabaseService();
      await supa.from("chats").update({ title }).eq("id", chatId);
    } catch {}

    return NextResponse.json({ ok: true, title });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "internal error" }, { status: 500 });
  }
}
