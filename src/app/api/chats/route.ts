// src/app/api/chats/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

/**
 * GET /api/chats
 * Returns the current user's chats (RLS-enforced).
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

    const supa = supabaseServerWithAuth(token);

    // Confirm the requester; RLS will still enforce, but this helps us return 401 early.
    const { data: userRes, error: userErr } = await supa.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Only chats owned by auth.uid() are visible due to RLS
    const { data, error } = await supa
      .from("chats")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chats: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/chats
 * Body: { title?: string }
 * Creates a new chat owned by the current user. Returns the full row.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

    const supa = supabaseServerWithAuth(token);

    // Must be authenticated; we'll store user_id from auth.uid()
    const { data: userRes, error: userErr } = await supa.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = userRes.user.id;
    const body = await req.json().catch(() => ({}));
    const title = (body?.title ?? "New chat").toString().slice(0, 200);

    // Insert with user_id so the RLS policy allows it
    const { data, error } = await supa
      .from("chats")
      .insert({
        title,
        user_id: userId,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, chat: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
