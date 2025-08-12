import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Body = { chatId?: string; text: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (!text) return NextResponse.json({ error: "Missing 'text'." }, { status: 400 });

  // Ensure a session exists (create if missing)
  let sessionId = body.chatId?.trim();
  if (!sessionId) {
    const created = await supabaseAdmin
      .from("chat_sessions")
      .insert({ title: "New Chat" })
      .select("id")
      .single();
    if (created.error) return NextResponse.json({ error: created.error.message }, { status: 500 });
    sessionId = created.data!.id;
  }

  // Insert user message
  const userInsert = await supabaseAdmin
    .from("chat_messages")
    .insert({ session_id: sessionId, role: "user", content: text })
    .select("id")
    .single();
  if (userInsert.error) return NextResponse.json({ error: userInsert.error.message }, { status: 500 });

  // Stub assistant reply
  const reply = generateStubbedReply(text);

  const assistInsert = await supabaseAdmin
    .from("chat_messages")
    .insert({ session_id: sessionId, role: "assistant", content: reply })
    .select("id,content")
    .single();
  if (assistInsert.error) return NextResponse.json({ error: assistInsert.error.message }, { status: 500 });

  // Update session timestamps
  await supabaseAdmin
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString(), last_message_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({
    chatId: sessionId,
    message: { id: assistInsert.data!.id, role: "assistant", content: assistInsert.data!.content },
  });
}

function generateStubbedReply(userText: string): string {
  const t = userText.trim();
  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))\b/i.test(t) || t.length <= 5) {
    return "Hi there! 👋 How can I help today — staffing, PBJ, payroll, survey prep, or something else?";
  }
  if (/pbj/i.test(t)) {
    return "Here’s a quick PBJ checklist:\n\n• Verify pay period dates & CCN\n• Map titles → CMS job categories\n• Reconcile payroll hours vs PBJ totals\n• Include agency hours & align to census\n• Export XML, run CMS checker, then submit\n\nWant me to generate a step-by-step for your dates?";
  }
  if (/overtime|ot/i.test(t)) {
    return "Overtime essentials:\n\n1) Confirm non-exempt status + base rate\n2) Track all hours worked (incl. handoffs)\n3) 1.5× regular rate >40 hrs/wk (include diffs/bonuses)\n4) Watch double shifts/call-ins\n5) Run an audit monthly\n\nNeed a calculator or policy snippet?";
  }
  if (/survey|doh|state/i.test(t)) {
    return "Survey readiness focus:\n\n• Daily: med pass audits, falls huddles, infection logs\n• Weekly: care plan timeliness, skin rounds, MAR/TAR spot checks\n• Docs: incident packets, QA minutes, education proofs\n• Environment: call lights, PPE, signage, temp logs\n\nI can assemble a readiness checklist tailored to your units.";
  }
  return "Got it. Tell me the goal and any constraints, and I’ll outline the steps, owners, and a quick template to get you moving.";
}
