// src/app/api/chat/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { providerFromEnv } from "@/lib/ai/providers";
import { scrubPHI, likelyPHI } from "@/lib/privacy/scrub";
import { encryptPHI } from "@/lib/crypto/phi";
import { recordAudit } from "@/lib/audit";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

function bad(status: number, message: string) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: NextRequest) {
  const hipaa = process.env.HIPAA_MODE === "true";
  const requestId = crypto.randomUUID();
  try {
    const body = await req.json().catch(() => ({}));
    const { chatId, content, facilityId = null, category = null } = body || {};
    const text = (content ?? "").trim();
    if (!text) return bad(400, "content required");

    const authHeader = req.headers.get("authorization") || undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);
    const svc = supabaseService();

    // Get user
    const { data: userRes } = await supa.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    // Encrypt and store user message
    const enc = encryptPHI(text);
    const isPhi = hipaa ? true : likelyPHI(text);
    const { data: userMsg, error: insErr } = await supa
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "user",
        content_enc: enc.ciphertext.toString("base64"),
        content_iv: enc.iv.toString("base64"),
        content_tag: enc.tag.toString("base64"),
        content_sha256: enc.sha256,
        is_phi: isPhi,
      })
      .select("*")
      .single();
    if (insErr) return bad(500, insErr.message);

    await recordAudit({
      user_id: userId,
      action: "message.create",
      resource_type: "message",
      resource_id: userMsg?.id || null,
      route: "/api/chat",
      request_id: requestId,
      ip: req.ip || null,
      user_agent: req.headers.get("user-agent"),
      metadata: { role: "user", chatId, is_phi: isPhi },
    });

    // Build minimal history (don’t decrypt/send PHI if HIPAA mode)
    const { data: hist } = await supa
      .from("messages")
      .select("role, content_enc, content_iv, content_tag")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Scrub PHI prior to model egress
    const toProvider = [];
    for (const m of hist || []) {
      // We *only* send scrubbed text, not decrypted raw PHI.
      const bundle = { ciphertext: Buffer.from(m.content_enc, "base64"), iv: Buffer.from(m.content_iv, "base64"), tag: Buffer.from(m.content_tag, "base64") };
      let decrypted: string = "";
      try {
        // Decrypt in memory (this is still on your server)
        const { decryptPHI } = await import("@/lib/crypto/phi");
        decrypted = decryptPHI(bundle);
      } catch {
        decrypted = "";
      }
      const { cleaned } = scrubPHI(decrypted);
      toProvider.push({ role: (m.role as "user" | "assistant") ?? "user", content: cleaned });
    }

    // RAG context (facility/category aware)
    const rag = await buildRagContext({ query: text, facilityId, category, topK: 6, accessToken: token });
    const system = `You are CareIQ, an HR/healthcare assistant. If you use the context below, cite sources by number.\n\n${rag || ""}`.trim();

    // HIPAA provider enforcement
    const provider = providerFromEnv();
    if (hipaa && provider.name === "local-echo") {
      return bad(400, "HIPAA mode requires a HIPAA-eligible AI_PROVIDER (e.g., azure-openai).");
    }

    const messages = [{ role: "system" as const, content: system }, ...toProvider];
    const answer = await provider.complete(messages, { temperature: 0.2, max_tokens: 1200 });

    // Save assistant reply (encrypt too)
    const encA = encryptPHI(answer);
    const { data: assistMsg, error: saveErr } = await supa
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content_enc: encA.ciphertext.toString("base64"),
        content_iv: encA.iv.toString("base64"),
        content_tag: encA.tag.toString("base64"),
        content_sha256: encA.sha256,
        is_phi: hipaa ? true : false,
      })
      .select("*")
      .single();
    if (saveErr) return bad(500, saveErr.message);

    await recordAudit({
      user_id: userId,
      action: "model.infer",
      resource_type: "chat",
      resource_id: chatId,
      route: "/api/chat",
      request_id: requestId,
      ip: req.ip || null,
      user_agent: req.headers.get("user-agent"),
      metadata: { provider: provider.name, scrubbed: true },
    });

    // We only return the assistant text to the client; client never sees raw ciphertext.
    return NextResponse.json({ ok: true, content: answer });
  } catch (err: any) {
    // Do not log body/content
    await recordAudit({
      action: "error",
      route: "/api/chat",
      request_id: requestId,
      metadata: { message: String(err?.message || err) },
    });
    return bad(500, "Internal error");
  }
}
