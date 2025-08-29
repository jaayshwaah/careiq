export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

/**
 * GET /api/bookmarks - Get user's bookmarks
 * Query params: ?chat_id=uuid (optional filter)
 */
export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const chatId = url.searchParams.get('chat_id');

    let query = supa
      .from("chat_bookmarks")
      .select(`
        id,
        chat_id,
        message_id,
        title,
        notes,
        tags,
        created_at,
        updated_at,
        chats!inner(id, title)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (chatId) {
      query = query.eq("chat_id", chatId);
    }

    const { data: bookmarks, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bookmarks: bookmarks || [] });

  } catch (error) {
    console.error("Get bookmarks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/bookmarks - Create a bookmark
 * Body: { chat_id, message_id?, title?, notes?, tags? }
 */
export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.API);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { chat_id, message_id = null, title = null, notes = null, tags = [] } = await req.json();
    
    if (!chat_id) {
      return NextResponse.json({ ok: false, error: "chat_id is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to the chat
    const { data: chat, error: chatError } = await supa
      .from("chats")
      .select("id")
      .eq("id", chat_id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ ok: false, error: "Chat not found or access denied" }, { status: 404 });
    }

    const { data: bookmark, error } = await supa.from("chat_bookmarks").insert({
      user_id: user.id,
      chat_id,
      message_id,
      title,
      notes,
      tags,
    }).select().single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bookmark });

  } catch (err: any) {
    console.error("Create bookmark error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/bookmarks?id=bookmark_id - Delete a bookmark
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const bookmarkId = url.searchParams.get('id');
    
    if (!bookmarkId) {
      return NextResponse.json({ error: "Bookmark ID is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supa
      .from("chat_bookmarks")
      .delete()
      .eq("id", bookmarkId)
      .eq("user_id", user.id); // Ensure user owns the bookmark

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Delete bookmark error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
