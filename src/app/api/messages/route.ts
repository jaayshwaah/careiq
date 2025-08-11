import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' string in body" }, { status: 400 });
    }

    const reply = generateStubbedReply(text);

    return NextResponse.json({
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
  }
}

function generateStubbedReply(userText: string): string {
  const t = userText.trim();

  // Friendly greetings for short/hello-style inputs
  if (/^(hi|hello|hey|yo|sup|good (morning|afternoon|evening))\b/i.test(t) || t.length <= 5) {
    return "Hi there! 👋 How can I help today — staffing, PBJ, payroll, survey prep, or something else?";
  }

  // Topic heuristics
  if (/pbj/i.test(t)) {
    return "Here’s a quick PBJ checklist:\n\n• Verify pay period dates & CCN\n• Map titles → CMS job categories\n• Reconcile payroll hours vs PBJ totals\n• Include agency hours & align to census\n• Export XML, run CMS checker, then submit\n\nWant me to generate a step-by-step for your dates?";
  }
  if (/overtime|ot/i.test(t)) {
    return "Overtime essentials:\n\n1) Confirm non-exempt status + base rate\n2) Track all hours worked (incl. handoffs)\n3) 1.5× regular rate >40 hrs/wk (include diffs/bonuses in calc)\n4) Watch double shifts/call-ins\n5) Run an audit report monthly\n\nNeed a calculator or policy snippet?";
  }
  if (/survey|doh|state/i.test(t)) {
    return "Survey readiness focus:\n\n• Daily: med pass audits, falls huddles, infection logs\n• Weekly: care plan timeliness, skin rounds, MAR/TAR spot checks\n• Docs: incident packets, QA minutes, education proofs\n• Environment: call lights, PPE, signage, temp logs\n\nI can assemble a readiness checklist tailored to your units.";
  }

  // Default helper
  return "Got it. Tell me the goal and any constraints, and I’ll outline the steps, owners, and a quick template to get you moving.";
}
