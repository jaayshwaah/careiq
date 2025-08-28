export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { encryptPHI } from "@/lib/crypto/phi";

export async function POST(req: NextRequest) {
  try {
    const { id, content } = await req.json();
    if (!id || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ ok: false, error: 'id and content required' }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error } = await supa.auth.getUser();
    if (error || !user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const enc = encryptPHI(content.trim());
    const { error: upErr } = await supa
      .from('messages')
      .update({
        content_enc: enc.ciphertext.toString('base64'),
        content_iv: enc.iv.toString('base64'),
        content_tag: enc.tag.toString('base64'),
      })
      .eq('id', id);

    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'internal error' }, { status: 500 });
  }
}

