// src/app/api/facility-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Simple function to search Medicare.gov Care Compare data
async function searchFacility(facilityName: string, state: string) {
  try {
    // This is a simplified approach - in a real implementation, you'd use the CMS API
    // For now, we'll simulate facility data based on common metrics
    const facilityData = {
      name: facilityName,
      state: state,
      overallRating: Math.floor(Math.random() * 5) + 1,
      healthInspections: Math.floor(Math.random() * 5) + 1,
      qualityMeasures: Math.floor(Math.random() * 5) + 1,
      staffing: Math.floor(Math.random() * 5) + 1,
      shortStay: Math.floor(Math.random() * 5) + 1,
      longStay: Math.floor(Math.random() * 5) + 1,
      lastUpdated: new Date().toISOString(),
      // Add some mock deficiencies and strengths
      deficiencies: [
        "Nursing staffing levels below average for similar facilities",
        "Quality measure scores for pain management need improvement",
        "Recent health inspection cited medication administration issues"
      ],
      strengths: [
        "Above average resident satisfaction scores",
        "Good infection control practices",
        "Strong family involvement programs"
      ]
    };
    
    return facilityData;
  } catch (error) {
    console.error("Error searching facility:", error);
    throw new Error("Failed to retrieve facility data");
  }
}

async function analyzeFacility(facilityData: any) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o";

  if (!OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }

  const prompt = `Analyze this nursing home facility's Medicare Care Compare data and provide specific improvement recommendations:

Facility: ${facilityData.name} (${facilityData.state})
Overall Rating: ${facilityData.overallRating}/5 stars
Health Inspections: ${facilityData.healthInspections}/5 stars  
Quality Measures: ${facilityData.qualityMeasures}/5 stars
Staffing: ${facilityData.staffing}/5 stars
Short Stay: ${facilityData.shortStay}/5 stars
Long Stay: ${facilityData.longStay}/5 stars

Current Deficiencies:
${facilityData.deficiencies.map((d: string) => `- ${d}`).join('\n')}

Current Strengths:
${facilityData.strengths.map((s: string) => `- ${s}`).join('\n')}

Please provide:
1. Priority improvement areas (specific and actionable)
2. Star rating improvement strategies
3. Compliance recommendations
4. Staff training suggestions
5. Quality measure enhancement tactics

Format as JSON with sections: priorityAreas, starRatingStrategies, complianceRecommendations, staffTraining, qualityEnhancements`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://careiq.vercel.app",
      "X-Title": process.env.OPENROUTER_SITE_NAME || "CareIQ",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an expert nursing home compliance consultant. Analyze facility data and provide specific, actionable improvement recommendations. Always respond in valid JSON format."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenRouter error:", response.status, error);
    throw new Error("AI analysis failed");
  }

  const result = await response.json();
  const analysisText = result.choices?.[0]?.message?.content || "";
  
  try {
    return JSON.parse(analysisText);
  } catch {
    // If JSON parsing fails, return a structured fallback
    return {
      priorityAreas: ["Improve nursing staffing ratios", "Enhance quality measures", "Address inspection deficiencies"],
      starRatingStrategies: ["Focus on staffing metrics", "Implement quality improvement programs"],
      complianceRecommendations: ["Regular staff training", "Updated policies and procedures"],
      staffTraining: ["Medication administration", "Infection control", "Resident care protocols"],
      qualityEnhancements: ["Pain management protocols", "Fall prevention programs", "Nutrition care plans"]
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for facility information
    const { data: profile, error: profileError } = await supa
      .from("profiles")
      .select("facility_name, facility_state")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.facility_name || !profile?.facility_state) {
      return NextResponse.json({ 
        error: "Facility information not found. Please update your profile with facility name and state." 
      }, { status: 400 });
    }

    // Search for facility data
    const facilityData = await searchFacility(profile.facility_name, profile.facility_state);
    
    // Generate AI analysis
    const analysis = await analyzeFacility(facilityData);

    const result = {
      facility: facilityData,
      analysis: analysis,
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Facility analysis error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to analyze facility" 
    }, { status: 500 });
  }
}