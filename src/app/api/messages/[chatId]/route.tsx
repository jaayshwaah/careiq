// src/app/api/messages/[chatId]/route.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { decryptPHI } from "@/lib/crypto/phi";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const authHeader = req.headers.get("authorization") || undefined;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const supa = supabaseServerWithAuth(token);
  const { chatId } = await params;

  // RLS should ensure only owners can see these rows
  const { data, error } = await supa
    .from("messages")
    .select("id, role, content_enc, content_iv, content_tag, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const messages = (data ?? []).map((m: any) => {
    try {
      const content = decryptPHI({
        ciphertext: Buffer.from(m.content_enc, "base64"),
        iv: Buffer.from(m.content_iv, "base64"),
        tag: Buffer.from(m.content_tag, "base64"),
      });
      return { id: m.id, role: m.role, content, created_at: m.created_at };
    } catch {
      return { id: m.id, role: m.role, content: "[Decryption error]", created_at: m.created_at };
    }
  });

  return NextResponse.json({ ok: true, messages });
}
