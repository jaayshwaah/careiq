export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { buildRagContext } from "@/lib/ai/buildRagContext";

export async function POST(req: NextRequest) {
  try {
    const { query, filters = {} } = await req.json();
    if (!query?.trim()) return NextResponse.json({ ok: false, error: "Query required" }, { status: 400 });

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    let profile: any = null;
    if (user) {
      const { data } = await supa
        .from("profiles")
        .select("role, facility_id, facility_name, facility_state")
        .eq("user_id", user.id)
        .single();
      profile = data;
    }

    const ragContext = await buildRagContext({
      query,
      facilityId: profile?.facility_id || filters.facilityId,
      facilityState: profile?.facility_state || filters.state,
      category: filters.category,
      topK: filters.limit || 8,
      accessToken: token,
      useVector: true,
    });

    const results = parseRagContext(ragContext);
    const prioritized = prioritizeResults(results, profile);

    return NextResponse.json({
      ok: true,
      results: prioritized,
      context: ragContext,
      userContext: { role: profile?.role, facility: profile?.facility_name, state: profile?.facility_state },
    });
  } catch (error: any) {
    console.error("smart-search error", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

function parseRagContext(context: string) {
  const out: any[] = [];
  if (!context) return out;
  const sections = context.split(/\*\*[^*]+:\*\*/);
  sections.forEach((section, idx) => {
    if (idx === 0) return;
    section
      .split(/\(\d+\)/)
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((entry) => {
        const lines = entry.split("\n");
        const title = lines[0]?.trim();
        const content = lines.slice(1).join("\n").trim();
        if (title && content) {
          out.push({
            id: `result-${idx}-${out.length}`,
            title,
            content,
            category: detectCategory(entry),
          });
        }
      });
  });
  return out;
}

function prioritizeResults(results: any[], profile: any) {
  const buckets = { critical: [], roleSpecific: [], facilitySpecific: [], general: [] } as Record<string, any[]>;
  for (const r of results) {
    const lc = r.content.toLowerCase();
    if (/\b(cfr|f\-?tag|must|shall)\b/i.test(r.content)) buckets.critical.push(r);
    else if (profile?.role && lc.includes(String(profile.role).toLowerCase())) buckets.roleSpecific.push(r);
    else if (profile?.facility_name && r.content.includes(profile.facility_name)) buckets.facilitySpecific.push(r);
    else buckets.general.push(r);
  }
  return [...buckets.critical, ...buckets.roleSpecific, ...buckets.facilitySpecific, ...buckets.general].slice(0, 10);
}

function detectCategory(text: string) {
  const t = text.toLowerCase();
  if (t.includes("cfr") || t.includes("cms")) return "Federal Regulation";
  if (t.includes("joint commission")) return "Accreditation";
  if (t.includes("cdc")) return "Public Health";
  if (t.includes("policy") || t.includes("procedure")) return "Policy";
  if (/(texas|california|florida|new york|illinois)/.test(t) || t.includes("state")) return "State Regulation";
  return "General";
}

