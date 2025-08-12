// src/app/api/chats/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

/**
 * GET /api/chats
 * - Returns the current user's chats (empty if not signed in).
 */
export async function GET() {
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
      // Anonymous request: return empty list instead of 401 so the app can render
      return NextResponse.json({ ok: true, chats: [] }, { status: 200 });
    }

    // Adjust table/columns to your schema. If your table is "conversations", change below.
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chats: data ?? [] }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats
 * - Creates a new chat for the current user (title optional, defaults to "New chat")
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
    const title: string = (body?.title || "New chat").toString();

    // Adjust table/columns to your schema. If your table is "conversations", change below.
    const { data, error } = await supabase
      .from("chats")
      .insert([{ title, user_id: user.id }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chat: data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
