export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

const SURVEY_CHECKLIST_SECTIONS = {
  documentation: {
    title: 'Documentation & Records',
    items: [
      { id: 'policies', task: 'Review and update all facility policies', critical: true, ftag: 'F880' },
      { id: 'qapi', task: 'Ensure QAPI plan is current', critical: true, ftag: 'F865' },
      { id: 'staffing', task: 'Verify staffing records and PBJ submissions', critical: true, ftag: 'F725' },
    ]
  },
  clinical: {
    title: 'Clinical Care & Quality',
    items: [
      { id: 'care-plans', task: 'Review resident care plans for completeness', critical: true, ftag: 'F656' },
      { id: 'mds-accuracy', task: 'Audit recent MDS assessments for accuracy', critical: true, ftag: 'F636' },
    ]
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const surveyType = searchParams.get('surveyType') || 'Standard';
    const facilityType = searchParams.get('facilityType') || 'SNF';

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { data: progress } = await supa
      .from("survey_prep_progress")
      .select("checklist_data, notes, assignments")
      .eq("user_id", user.id)
      .single();

    const customized = customizeChecklist(SURVEY_CHECKLIST_SECTIONS, surveyType, facilityType);

    return NextResponse.json({
      ok: true,
      sections: customized,
      progress: progress?.checklist_data || {},
      notes: progress?.notes || {},
      assignments: progress?.assignments || {},
      surveyType,
      facilityType
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { checklistData, surveyType, facilityType, notes, assignments } = await req.json();

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    const { data: { user } } = await supa.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { error } = await supa
      .from("survey_prep_progress")
      .upsert({
        user_id: user.id,
        checklist_data: checklistData || {},
        survey_type: surveyType || 'Standard',
        facility_type: facilityType || 'SNF',
        notes: notes || {},
        assignments: assignments || {},
        last_updated: new Date().toISOString()
      });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

function customizeChecklist(base: any, surveyType: string, facilityType: string) {
  const sections = JSON.parse(JSON.stringify(base));
  if (surveyType === 'Complaint') {
    sections.documentation.items = sections.documentation.items.filter((i: any) => ['policies'].includes(i.id));
  }
  if (facilityType === 'ICF/IID') {
    sections.residents = {
      title: 'Individual Program Plans',
      items: [
        { id: 'ipp', task: 'Review Individual Program Plans (IPP)', critical: true, ftag: 'F870' },
        { id: 'active-treatment', task: 'Verify active treatment programs', critical: true, ftag: 'F871' }
      ]
    };
  }
  return sections;
}

