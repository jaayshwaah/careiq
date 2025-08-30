// src/app/api/cms-guidance/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');
    const favorites = searchParams.get('favorites') === 'true';

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    const supa = supabaseServerWithAuth(token);

    // For now, return mock data - in production this would come from database
    const mockRegulations = [
      {
        id: "f-tag-514",
        category: "Quality of Care",
        title: "Nursing Services - Sufficient Staff (F-Tag 514)",
        description: "Each resident must receive and the facility must provide the necessary care and services to attain or maintain the highest practicable physical, mental, and psychosocial well-being.",
        severity: "critical",
        fTag: "F-514",
        scope: "All nursing home residents requiring nursing services",
        lastUpdated: "2024-01-15",
        tags: ["staffing", "nursing", "quality", "care-planning"],
        requirements: [
          "Provide 24-hour nursing services sufficient to meet resident needs",
          "Ensure RN supervision at least 8 consecutive hours per day, 7 days a week",
          "Maintain adequate staffing levels to meet residents' assessed needs",
          "Have a charge nurse on each tour of duty"
        ],
        consequences: "Immediate Jeopardy potential with fines up to $21,393 per day. Can lead to termination of provider agreement.",
        bestPractices: [
          "Conduct regular staffing assessments based on resident acuity",
          "Implement consistent assignment practices",
          "Maintain comprehensive orientation programs",
          "Use evidence-based staffing tools and metrics",
          "Document all staffing decisions and rationales"
        ],
        relatedRegulations: ["F-515", "F-516", "F-725"]
      },
      {
        id: "f-tag-686",
        category: "Infection Prevention",
        title: "Infection Prevention and Control Program (F-Tag 686)",
        description: "The facility must establish an infection prevention and control program (IPCP) that must be designed to provide a safe, sanitary, and comfortable environment and to help prevent the development and transmission of communicable diseases and infections.",
        severity: "critical",
        fTag: "F-686",
        scope: "All residents, staff, and visitors",
        lastUpdated: "2024-02-20",
        tags: ["infection-control", "safety", "covid", "communicable-diseases"],
        requirements: [
          "Designate an infection preventionist with specialized training",
          "Establish written infection prevention and control policies",
          "Implement surveillance, prevention, and control of infections",
          "Provide infection prevention education to staff",
          "Maintain isolation precautions when indicated",
          "Report communicable diseases and infections to appropriate authorities"
        ],
        consequences: "Can result in Immediate Jeopardy citations with fines up to $21,393 per day. May require immediate closure of facility.",
        bestPractices: [
          "Implement evidence-based infection prevention protocols",
          "Conduct regular hand hygiene audits",
          "Maintain proper PPE inventory and training",
          "Establish antimicrobial stewardship programs",
          "Create robust outbreak response plans"
        ],
        relatedRegulations: ["F-880", "F-441", "F-607"]
      }
    ];

    const mockUpdates = [
      {
        id: "update-1",
        title: "New CMS Staffing Requirements Take Effect",
        summary: "CMS has implemented new minimum staffing requirements for nursing homes, including specific RN and total nursing hour minimums.",
        date: "2024-02-15",
        category: "Staffing",
        impact: "high",
        source: "CMS.gov",
        link: "https://cms.gov/staffing-updates"
      },
      {
        id: "update-2",
        title: "Updated Infection Control Guidelines",
        summary: "New guidance on respiratory infection prevention protocols, including updated isolation procedures.",
        date: "2024-02-10",
        category: "Infection Control",
        impact: "medium",
        source: "CDC",
        link: "https://cdc.gov/ltc-infection-control"
      }
    ];

    return NextResponse.json({ 
      ok: true, 
      regulations: mockRegulations,
      updates: mockUpdates 
    });

  } catch (error: any) {
    console.error('CMS Guidance API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, regulationId, userId } = body;

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    const supa = supabaseServerWithAuth(token);

    if (action === 'toggle_favorite') {
      // In a real implementation, you would save/remove favorites to database
      // For now, just return success
      return NextResponse.json({ 
        ok: true, 
        message: `Regulation ${regulationId} ${body.isFavorite ? 'added to' : 'removed from'} favorites` 
      });
    }

    if (action === 'track_access') {
      // Track regulation access for analytics
      const { data, error } = await supa
        .from('cms_regulation_access')
        .insert({
          regulation_id: regulationId,
          user_id: userId,
          accessed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to track access:', error);
        // Don't fail the request for tracking errors
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error('CMS Guidance API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}