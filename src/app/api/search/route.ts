// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

/**
 * GET /api/search?q=...&limit=20
 * - Searches within the signed-in user's data:
 *   - conversations.title ILIKE %q%
 *   - messages.content ILIKE %q% (restricted to the user's conversation_ids)
 * - Returns { ok, conversations, messages }
 */
export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const limitParam = parseInt(url.searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 20;

    if (!q) {
      return NextResponse.json({
        ok: true,
        conversations: [],
        messages: [],
        note: "No query provided",
      });
    }

    // 1) Search conversations owned by the user
    const { data: conversations, error: convErr } = await supabase
      .from("conversations")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .ilike("title", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (convErr) {
      return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
    }

    // 2) Get all conversation ids owned by user (for safe messages search)
    const { data: convIdsData, error: convIdsErr } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    if (convIdsErr) {
      return NextResponse.json({ ok: false, error: convIdsErr.message }, { status: 500 });
    }

    const convIds = (convIdsData ?? []).map((c) => c.id);
    let messages: any[] = [];

    if (convIds.length > 0) {
      // 3) Search messages only within user-owned conversations
      const { data: messagesData, error: msgErr } = await supabase
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .in("conversation_id", convIds)
        .ilike("content", `%${q}%`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (msgErr) {
        return NextResponse.json({ ok: false, error: msgErr.message }, { status: 500 });
      }

      messages = messagesData ?? [];
    }

    return NextResponse.json({
      ok: true,
      conversations: conversations ?? [],
      messages,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
