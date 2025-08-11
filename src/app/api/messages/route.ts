import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing 'text' string in body" }, { status: 400 });
    }

    // Simple stubbed assistant reply tailored for HR/nursing home context.
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
  // Lightweight heuristic: give a structured, concise response that "feels" helpful.
  const lead = "Got it — here’s a concise starting point:";
  if (/pbj/i.test(userText)) {
    return `${lead}\n\n• Verify pay period dates and facility CCN\n• Map job titles to CMS categories\n• Reconcile hours vs. payroll register\n• Validate agency hours and census alignment\n• Export XML, run CMS checker, then submit\n\nWant a step-by-step checklist?`;
  }
  if (/overtime|ot/i.test(userText)) {
    return `${lead}\n\n1) Confirm non-exempt status and base rate\n2) Track all hours worked (including change-of-shift)\n3) Apply OT at 1.5× regular rate >40 hrs/week\n4) Include differentials/bonuses in regular-rate calc\n5) Audit for double shifts and call-ins\n\nI can generate a policy blurb or calculator next.`;
  }
  if (/survey|doh|state/i.test(userText)) {
    return `${lead}\n\n• Daily: med pass audits, falls huddles, infection logs\n• Weekly: care plan timeliness, skin rounds, MAR/TAR spot checks\n• Docs: incident packets, QA minutes, staff education proofs\n• Environment: call lights, PPE, signage, temp logs\n\nWant me to build a survey-readiness checklist PDF?`;
  }
  // Default generic helper
  return `${lead}\n\n• Clarify the goal and constraints\n• List needed data/systems (Rippling, LMS, PBJ, census)\n• Draft the steps and owners\n• Add timelines and a quick template\n\nSay “make the template” and I’ll produce it.`;
}
