// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

/**
 * GET /api/messages?conversation_id=...
 * - Returns messages for the given conversation owned by the current user
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
    const conversationId = url.searchParams.get("conversation_id");
    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: "Missing conversation_id" },
        { status: 400 }
      );
    }

    // Optional: ensure the conversation belongs to the user
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .single();

    if (convErr) {
      return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
    }
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messages: data ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * body: { conversation_id: string, role: "user" | "assistant" | "system", content: string }
 * - Inserts a new message for the current user’s conversation
 */
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
    const conversation_id: string | undefined = body?.conversation_id;
    const role: string = body?.role || "user";
    const content: string = body?.content || "";

    if (!conversation_id) {
      return NextResponse.json(
        { ok: false, error: "conversation_id is required" },
        { status: 400 }
      );
    }
    if (!content) {
      return NextResponse.json(
        { ok: false, error: "content is required" },
        { status: 400 }
      );
    }

    // Verify ownership of the conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", conversation_id)
      .single();

    if (convErr) {
      return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
    }
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([{ conversation_id, role, content }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
