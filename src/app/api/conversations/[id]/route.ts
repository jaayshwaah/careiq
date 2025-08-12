// src/app/api/conversations/[id]/route.ts
import { NextResponse } from "next/server";
import { createClientServer } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientServer();
    const id = params.id;

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const title: string | undefined = body?.title?.toString();
    if (!title) {
      return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    }

    // Verify ownership
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", id)
      .single();
    if (convErr) return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("conversations")
      .update({ title })
      .eq("id", id)
      .select()
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, conversation: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientServer();
    const id = params.id;

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) return NextResponse.json({ ok: false, error: userErr.message }, { status: 401 });
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    // Verify ownership
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", id)
      .single();
    if (convErr) return NextResponse.json({ ok: false, error: convErr.message }, { status: 500 });
    if (!conv || conv.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Optional: delete messages first if you don't have ON DELETE CASCADE
    // await supabase.from("messages").delete().eq("conversation_id", id);

    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
