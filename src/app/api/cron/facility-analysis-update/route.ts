// src/app/api/cron/facility-analysis-update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Helper function to search facility data (reused from facility-analysis route)
async function searchFacility(facilityName: string, state: string) {
  try {
    console.log(`[CRON] Searching for facility: ${facilityName}, ${state}`);
    
    // Try the CMS API with multiple search strategies
    const searchStrategies = [
      facilityName,
      facilityName.replace(/\b(nursing home|skilled nursing facility|SNF|rehabilitation center|rehab center|care center|health center|healthcare center|medical center|manor|villa|gardens|commons|residence|assisted living|memory care|long term care|LTC)\b/gi, '').trim(),
      facilityName.replace(/\b(the|of|at|in|a|an|and|&)\b/gi, '').replace(/\s+/g, ' ').trim(),
      facilityName.split(' ').slice(0, 3).join(' '),
      facilityName.split(' ').slice(0, 2).join(' '),
      facilityName.replace(/\([^)]*\)/g, '').trim(),
      facilityName.replace(/\bSaint\b/gi, 'St'),
      facilityName.replace(/\bSt\.?\b/gi, 'Saint'),
      facilityName.replace(/[0-9\-\.]/g, ' ').replace(/\s+/g, ' ').trim(),
      facilityName.replace(/\bHealthcare\b/gi, 'Health Care'),
      facilityName.replace(/\bHealth Care\b/gi, 'Healthcare'),
      facilityName.replace(/\bHealth\b/gi, '').trim(),
      facilityName.replace(/\b(north|south|east|west|central|downtown|uptown)\b/gi, '').trim(),
      facilityName.split(' ').find(word => word.length > 3 && !/(the|of|at|in|and|a|an)/i.test(word)) || facilityName.split(' ')[0]
    ].filter((strategy, index, arr) => 
      strategy && 
      strategy.length > 2 && 
      arr.indexOf(strategy) === index
    );

    for (const searchName of searchStrategies) {
      try {
        const cmsApiUrl = `https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][resource]=facility_name&conditions[0][operator]=LIKE&conditions[0][value]=%25${encodeURIComponent(searchName)}%25&conditions[1][resource]=provider_state&conditions[1][operator]=%3D&conditions[1][value]=${encodeURIComponent(state)}&limit=10`;
        
        const apiResponse = await fetch(cmsApiUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CareIQ-Cron-Analysis/1.0'
          }
        });

        if (apiResponse.ok) {
          const cmsData = await apiResponse.json();
          
          if (cmsData.results && cmsData.results.length > 0) {
            // Find the best match
            let bestMatch = cmsData.results[0];
            let bestScore = 0;
            
            for (const result of cmsData.results) {
              let score = 0;
              const resultName = result.facility_name?.toLowerCase() || '';
              const searchLower = facilityName.toLowerCase();
              
              const normalizeForComparison = (name) => {
                return name
                  .replace(/\b(nursing home|skilled nursing facility|SNF|rehabilitation center|rehab center|care center|health center|healthcare center|medical center|manor|villa|gardens|commons|residence|assisted living|memory care|long term care|LTC|the|of|at|in|a|an|and|&)\b/gi, '')
                  .replace(/[^\w\s]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              };
              
              const normalizedResult = normalizeForComparison(resultName);
              const normalizedSearch = normalizeForComparison(searchLower);
              
              if (normalizedResult === normalizedSearch) {
                score = 100;
              } else if (resultName.includes(searchLower) || searchLower.includes(resultName.substring(0, Math.min(resultName.length, searchLower.length * 0.8)))) {
                score = 85;
              } else if (normalizedResult.includes(normalizedSearch) || normalizedSearch.includes(normalizedResult)) {
                score = 75;
              } else {
                const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
                const resultWords = normalizedResult.split(' ').filter(w => w.length > 2);
                
                let matchingWords = 0;
                let totalWords = searchWords.length;
                
                for (let i = 0; i < searchWords.length; i++) {
                  const searchWord = searchWords[i];
                  for (const resultWord of resultWords) {
                    if (searchWord === resultWord) {
                      matchingWords += 1;
                      break;
                    } else if (searchWord.length >= 4 && resultWord.length >= 4) {
                      if (searchWord.includes(resultWord) || resultWord.includes(searchWord)) {
                        matchingWords += 0.8;
                        break;
                      }
                    }
                  }
                }
                
                score = totalWords > 0 ? (matchingWords / totalWords) * 60 : 0;
                
                if (searchWords.length > 0 && resultWords.length > 0) {
                  if (searchWords[0] === resultWords[0] || 
                      (searchWords[0].length >= 4 && resultWords[0].length >= 4 && 
                       (searchWords[0].includes(resultWords[0]) || resultWords[0].includes(searchWords[0])))) {
                    score += 15;
                  }
                }
              }
              
              if (result.provider_state === state) {
                score += 5;
              }
              
              const lengthDiff = Math.abs(resultName.length - searchLower.length);
              if (lengthDiff > searchLower.length * 0.5) {
                score -= 10;
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = result;
              }
            }
            
            if (bestScore >= 30) {
              return {
                name: bestMatch.facility_name || facilityName,
                state: bestMatch.provider_state || state,
                providerId: bestMatch.federal_provider_number,
                overallRating: parseInt(bestMatch.overall_rating) || null,
                healthInspections: parseInt(bestMatch.survey_rating) || null,
                qualityMeasures: parseInt(bestMatch.quality_rating) || null,
                staffing: parseInt(bestMatch.staffing_rating) || null,
                lastUpdated: bestMatch.date_updated || new Date().toISOString(),
                address: bestMatch.provider_address,
                city: bestMatch.provider_city,
                zipCode: bestMatch.provider_zip_code,
                phoneNumber: bestMatch.provider_phone_number,
                ownershipType: bestMatch.ownership_type,
                certificationDate: bestMatch.certification_date,
                dataSource: "cms_api",
                staffingMetrics: {
                  totalNursingHours: bestMatch.total_nurse_staffing_hours || null,
                  rnHours: bestMatch.rn_staffing_hours || null,
                  lpnHours: bestMatch.lpn_staffing_hours || null,
                  cnaHours: bestMatch.cna_staffing_hours || null,
                  staffTurnover: bestMatch.staff_turnover_rate || null
                },
                qualityMetrics: {
                  longStayAntipsychotics: bestMatch.long_stay_antipsychotic_med || null,
                  shortStayRehospitalization: bestMatch.short_stay_rehospitalization || null,
                  shortStayPressureUlcers: bestMatch.short_stay_pressure_ulcer || null,
                  longStayFalls: bestMatch.long_stay_falls_injury || null,
                  longStayUTIs: bestMatch.long_stay_uti || null,
                  longStayPressureUlcers: bestMatch.long_stay_pressure_ulcer || null,
                  longStayPain: bestMatch.long_stay_pain || null,
                  shortStayAntipsychotics: bestMatch.short_stay_antipsychotic_med || null,
                  longStayPhysicalRestraints: bestMatch.long_stay_physical_restraint || null
                },
                inspectionMetrics: {
                  totalDeficiencies: bestMatch.total_number_of_health_deficiencies || 0,
                  weightedHealthSurveyScore: bestMatch.total_weighted_health_survey_score || 0,
                  fireSafetyDeficiencies: bestMatch.total_number_of_fire_safety_deficiencies || 0,
                  complaintDeficiencies: bestMatch.number_of_complaint_substantiated_deficiencies || 0
                },
                deficiencies: bestMatch.total_weighted_health_survey_score > 50 ? [
                  "Health inspection deficiencies identified in recent surveys",
                  "Review compliance with CMS health and safety standards",
                  bestMatch.total_number_of_fire_safety_deficiencies > 0 ? "Fire safety deficiencies noted" : null,
                  bestMatch.number_of_complaint_substantiated_deficiencies > 0 ? "Substantiated complaint deficiencies" : null
                ].filter(Boolean) : [],
                strengths: [
                  bestMatch.overall_rating >= 4 ? "Above average overall 5-star rating" : null,
                  bestMatch.survey_rating >= 4 ? "Strong health inspection performance" : null,
                  bestMatch.staffing_rating >= 4 ? "Good staffing levels (RN hours & total nursing hours)" : null,
                  bestMatch.quality_rating >= 4 ? "Strong clinical quality measures" : null,
                  bestMatch.total_weighted_health_survey_score < 25 ? "Low health inspection deficiency score" : null
                ].filter(Boolean)
              };
            }
          }
        }
      } catch (apiError) {
        console.warn(`[CRON] CMS API search failed for ${searchName}:`, apiError);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("[CRON] Error searching facility:", error);
    return null;
  }
}

// AI analysis function (simplified for cron)
async function analyzeFacility(facilityData: any) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o";

  if (!OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }

  const prompt = `Analyze this nursing home facility's Medicare Care Compare data and provide specific improvement recommendations:

Facility: ${facilityData.name} (${facilityData.state})
Provider ID: ${facilityData.providerId}

=== MEDICARE 5-STAR RATINGS ===
Overall Rating: ${facilityData.overallRating}/5 stars
Health Inspections: ${facilityData.healthInspections}/5 stars
Staffing: ${facilityData.staffing}/5 stars
Quality Measures: ${facilityData.qualityMeasures}/5 stars

=== DETAILED METRICS ===
Staffing Details:
• Total Nursing Hours: ${facilityData.staffingMetrics?.totalNursingHours || 'N/A'}
• RN Hours: ${facilityData.staffingMetrics?.rnHours || 'N/A'}
• Staff Turnover: ${facilityData.staffingMetrics?.staffTurnover || 'N/A'}

Inspection Details:
• Total Health Deficiencies: ${facilityData.inspectionMetrics?.totalDeficiencies || 0}
• Weighted Health Survey Score: ${facilityData.inspectionMetrics?.weightedHealthSurveyScore || 0}
• Fire Safety Deficiencies: ${facilityData.inspectionMetrics?.fireSafetyDeficiencies || 0}

Quality Measures Performance:
• Long-Stay Antipsychotics: ${facilityData.qualityMetrics?.longStayAntipsychotics || 'N/A'}
• Short-Stay Rehospitalization: ${facilityData.qualityMetrics?.shortStayRehospitalization || 'N/A'}
• Falls with Injury: ${facilityData.qualityMetrics?.longStayFalls || 'N/A'}

Please provide a comprehensive analysis formatted as JSON with these sections:
1. careCompareSummary: Detailed summary of facility's Care Compare performance
2. priorityAreas: Top 3-5 areas that will have biggest impact on overall star rating
3. starRatingStrategies: Specific tactics to improve each component rating
4. complianceRecommendations: Health inspection and regulatory compliance actions
5. staffTraining: Training programs to improve staffing metrics
6. qualityEnhancements: Clinical improvement strategies
7. performanceTrends: Analysis of facility's performance trends
8. immediateActions: Top 3 actions to take within 30 days
9. longTermGoals: Strategic goals for 6-12 month improvement plan

Format as valid JSON with all sections included.`;

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
    console.error("[CRON] OpenRouter error:", response.status, error);
    throw new Error("AI analysis failed");
  }

  const result = await response.json();
  const analysisText = result.choices?.[0]?.message?.content || "";
  
  try {
    return JSON.parse(analysisText);
  } catch {
    return {
      priorityAreas: ["Improve nursing staffing ratios", "Enhance quality measures", "Address inspection deficiencies"],
      starRatingStrategies: ["Focus on staffing metrics", "Implement quality improvement programs"],
      complianceRecommendations: ["Regular staff training", "Updated policies and procedures"],
      staffTraining: ["Medication administration", "Infection control", "Resident care protocols"],
      qualityEnhancements: ["Pain management protocols", "Fall prevention programs", "Nutrition care plans"],
      immediateActions: ["Review staffing schedules", "Update care plans", "Staff training"],
      longTermGoals: ["Achieve 4+ star rating", "Reduce deficiencies", "Improve quality measures"]
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify this is a cron request (you can add additional verification)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[CRON] Starting weekly facility analysis update...");

    const supa = supabaseService();
    
    // Get all users with facility information
    const { data: profiles, error: profilesError } = await supa
      .from("profiles")
      .select("user_id, facility_name, facility_state")
      .not("facility_name", "is", null)
      .not("facility_state", "is", null);

    if (profilesError) {
      console.error("[CRON] Error fetching profiles:", profilesError);
      return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      console.log("[CRON] No profiles with facility information found");
      return NextResponse.json({ success: true, message: "No facilities to update" });
    }

    console.log(`[CRON] Found ${profiles.length} facilities to update`);

    let successCount = 0;
    let errorCount = 0;

    // Process each facility
    for (const profile of profiles) {
      try {
        console.log(`[CRON] Processing facility: ${profile.facility_name} (${profile.facility_state})`);

        // Search for updated facility data
        const facilityData = await searchFacility(profile.facility_name, profile.facility_state);
        
        if (!facilityData) {
          console.log(`[CRON] No data found for ${profile.facility_name}`);
          errorCount++;
          continue;
        }

        // Generate AI analysis
        const analysis = await analyzeFacility(facilityData);

        const result = {
          facility: facilityData,
          analysis: analysis,
          generatedAt: new Date().toISOString(),
          updatedBy: "weekly_cron"
        };

        // Update the analysis in knowledge_base
        const analysisData = {
          facility_id: profile.facility_name,
          category: 'Facility Policy',
          title: `Facility Performance Analysis - ${profile.facility_name}`,
          content: JSON.stringify(result),
          metadata: {
            content_type: 'facility_analysis',
            facility_name: profile.facility_name,
            facility_state: profile.facility_state,
            user_id: profile.user_id,
            generated_at: result.generatedAt,
            updated_by: 'weekly_cron'
          },
          source_url: null,
          last_updated: new Date().toISOString()
        };

        // Check if analysis exists
        const { data: existingRecord } = await supa
          .from('knowledge_base')
          .select('id')
          .eq('metadata->>content_type', 'facility_analysis')
          .eq('metadata->>user_id', profile.user_id)
          .eq('metadata->>facility_name', profile.facility_name)
          .order('last_updated', { ascending: false })
          .limit(1)
          .single();

        if (existingRecord) {
          // Update existing record
          await supa
            .from('knowledge_base')
            .update(analysisData)
            .eq('id', existingRecord.id);
        } else {
          // Create new record
          await supa.from('knowledge_base').insert(analysisData);
        }

        console.log(`[CRON] Successfully updated analysis for ${profile.facility_name}`);
        successCount++;

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[CRON] Error processing ${profile.facility_name}:`, error);
        errorCount++;
      }
    }

    console.log(`[CRON] Weekly update completed. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({ 
      success: true, 
      message: `Weekly facility analysis update completed`,
      stats: {
        total: profiles.length,
        success: successCount,
        errors: errorCount
      }
    });

  } catch (error: any) {
    console.error("[CRON] Weekly facility analysis update error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to update facility analyses" 
    }, { status: 500 });
  }
}
