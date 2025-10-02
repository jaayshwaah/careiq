// src/app/api/facility-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";

export const runtime = "nodejs";

// Helper function to parse scraped Medicare.gov data
function parseScrapedFacilityData(scrapedData: string, facilityName: string, state: string) {
  console.log('Parsing scraped facility data:', scrapedData);
  
  // Extract ratings using regex patterns and AI analysis
  const extractRating = (text: string, ratingType: string): number | null => {
    const patterns = [
      new RegExp(`${ratingType}[\\s:]*([1-5])\\s*star`, 'i'),
      new RegExp(`${ratingType}[\\s:]*([1-5])[\\s/]*5`, 'i'),
      new RegExp(`([1-5])\\s*star.*${ratingType}`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  };

  // Extract basic facility information
  const overallRating = extractRating(scrapedData, 'overall') || extractRating(scrapedData, 'total') || 3; // Default to 3 if not found
  const healthInspections = extractRating(scrapedData, 'health') || extractRating(scrapedData, 'inspection') || 3;
  const staffingRating = extractRating(scrapedData, 'staffing') || extractRating(scrapedData, 'staff') || 3;
  const qualityRating = extractRating(scrapedData, 'quality') || 3;

  // Extract provider ID
  const providerIdMatch = scrapedData.match(/provider\s+id[:\s]*([0-9A-Z]+)/i) || 
                         scrapedData.match(/federal\s+provider[:\s]*([0-9A-Z]+)/i);
  const providerId = providerIdMatch ? providerIdMatch[1] : null;

  // Extract address information
  const addressMatch = scrapedData.match(/address[:\s]*([^,\n]+(?:,[^,\n]+)*)/i);
  const phoneMatch = scrapedData.match(/phone[:\s]*(\([0-9]{3}\)[0-9\s-]+|\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
  
  return {
    name: facilityName,
    state: state,
    providerId: providerId || "SCRAPED_DATA",
    overallRating,
    healthInspections,
    qualityMeasures: qualityRating,
    staffing: staffingRating,
    lastUpdated: new Date().toISOString(),
    address: addressMatch ? addressMatch[1].trim() : "Address from Medicare.gov",
    city: state,
    zipCode: "From Medicare.gov",
    phoneNumber: phoneMatch ? phoneMatch[1] : "See Medicare.gov",
    ownershipType: "See Medicare.gov Care Compare",
    scrapedData: scrapedData, // Include raw scraped data for AI analysis
    dataSource: "medicare.gov_scraped",
    staffingMetrics: {
      totalNursingHours: null, // Will be extracted by AI if available
      rnHours: null,
      lpnHours: null,
      cnaHours: null,
      staffTurnover: null
    },
    qualityMetrics: {
      longStayAntipsychotics: null,
      shortStayRehospitalization: null,
      shortStayPressureUlcers: null,
      longStayFalls: null,
      longStayUTIs: null,
      longStayPressureUlcers: null,
      longStayPain: null,
      shortStayAntipsychotics: null,
      longStayPhysicalRestraints: null
    },
    inspectionMetrics: {
      totalDeficiencies: null,
      weightedHealthSurveyScore: null,
      fireSafetyDeficiencies: null,
      complaintDeficiencies: null
    },
    deficiencies: [],
    strengths: [
      overallRating >= 4 ? "Above average overall Medicare rating" : null,
      healthInspections >= 4 ? "Strong health inspection performance" : null,
      staffingRating >= 4 ? "Good staffing levels per Medicare standards" : null,
      qualityRating >= 4 ? "Strong clinical quality measures" : null
    ].filter(Boolean),
    isScrapedData: true
  };
}

// Helper function to map CMS API data to our format  
function mapCMSDataToFacility(facility: any, facilityName: string, state: string) {
  return {
    name: facility.facility_name || facilityName,
    state: facility.provider_state || state,
    providerId: facility.federal_provider_number,
    overallRating: parseInt(facility.overall_rating) || null,
    healthInspections: parseInt(facility.survey_rating) || null,
    qualityMeasures: parseInt(facility.quality_rating) || null,
    staffing: parseInt(facility.staffing_rating) || null,
    lastUpdated: facility.date_updated || new Date().toISOString(),
    address: facility.provider_address,
    city: facility.provider_city,
    zipCode: facility.provider_zip_code,
    phoneNumber: facility.provider_phone_number,
    ownershipType: facility.ownership_type,
    certificationDate: facility.certification_date,
    dataSource: "cms_api",
    staffingMetrics: {
      totalNursingHours: facility.total_nurse_staffing_hours || null,
      rnHours: facility.rn_staffing_hours || null,
      lpnHours: facility.lpn_staffing_hours || null,
      cnaHours: facility.cna_staffing_hours || null,
      staffTurnover: facility.staff_turnover_rate || null
    },
    qualityMetrics: {
      longStayAntipsychotics: facility.long_stay_antipsychotic_med || null,
      shortStayRehospitalization: facility.short_stay_rehospitalization || null,
      shortStayPressureUlcers: facility.short_stay_pressure_ulcer || null,
      longStayFalls: facility.long_stay_falls_injury || null,
      longStayUTIs: facility.long_stay_uti || null,
      longStayPressureUlcers: facility.long_stay_pressure_ulcer || null,
      longStayPain: facility.long_stay_pain || null,
      shortStayAntipsychotics: facility.short_stay_antipsychotic_med || null,
      longStayPhysicalRestraints: facility.long_stay_physical_restraint || null
    },
    inspectionMetrics: {
      totalDeficiencies: facility.total_number_of_health_deficiencies || 0,
      weightedHealthSurveyScore: facility.total_weighted_health_survey_score || 0,
      fireSafetyDeficiencies: facility.total_number_of_fire_safety_deficiencies || 0,
      complaintDeficiencies: facility.number_of_complaint_substantiated_deficiencies || 0
    },
    deficiencies: facility.total_weighted_health_survey_score > 50 ? [
      "Health inspection deficiencies identified in recent surveys",
      "Review compliance with CMS health and safety standards",
      facility.total_number_of_fire_safety_deficiencies > 0 ? "Fire safety deficiencies noted" : null,
      facility.number_of_complaint_substantiated_deficiencies > 0 ? "Substantiated complaint deficiencies" : null
    ].filter(Boolean) : [],
    strengths: [
      facility.overall_rating >= 4 ? "Above average overall 5-star rating" : null,
      facility.survey_rating >= 4 ? "Strong health inspection performance" : null,
      facility.staffing_rating >= 4 ? "Good staffing levels (RN hours & total nursing hours)" : null,
      facility.quality_rating >= 4 ? "Strong clinical quality measures" : null,
      facility.total_weighted_health_survey_score < 25 ? "Low health inspection deficiency score" : null
    ].filter(Boolean)
  };
}

// Function to search Medicare.gov Care Compare website and scrape real facility data
async function searchFacility(facilityName: string, state: string) {
  try {
    console.log(`Searching for facility: ${facilityName}, ${state}`);
    
    // First try the CMS API with multiple search strategies
    const searchStrategies = [
      // Exact match
      facilityName,
      
      // Remove common facility suffixes/types for better matching
      facilityName.replace(/\b(nursing home|skilled nursing facility|SNF|rehabilitation center|rehab center|care center|health center|healthcare center|medical center|manor|villa|gardens|commons|residence|assisted living|memory care|long term care|LTC)\b/gi, '').trim(),
      
      // Remove "the", "of", "at", etc. and normalize spacing
      facilityName.replace(/\b(the|of|at|in|a|an|and|&)\b/gi, '').replace(/\s+/g, ' ').trim(),
      
      // Try different word combinations
      facilityName.split(' ').slice(0, 3).join(' '),
      facilityName.split(' ').slice(0, 2).join(' '),
      
      // Remove parentheses and content inside
      facilityName.replace(/\([^)]*\)/g, '').trim(),
      
      // Saint <-> St conversions (very common in facility names)
      facilityName.replace(/\bSaint\b/gi, 'St'),
      facilityName.replace(/\bSt\.?\b/gi, 'Saint'),
      
      // Remove numbers, hyphens, and normalize
      facilityName.replace(/[0-9\-\.]/g, ' ').replace(/\s+/g, ' ').trim(),
      
      // Try with "Healthcare", "Health Care", "Health" variations
      facilityName.replace(/\bHealthcare\b/gi, 'Health Care'),
      facilityName.replace(/\bHealth Care\b/gi, 'Healthcare'),
      facilityName.replace(/\bHealth\b/gi, '').trim(),
      
      // Remove location identifiers that might not be in CMS data
      facilityName.replace(/\b(north|south|east|west|central|downtown|uptown)\b/gi, '').trim(),
      
      // First significant word only (last resort)
      facilityName.split(' ').find(word => word.length > 3 && !/(the|of|at|in|and|a|an)/i.test(word)) || facilityName.split(' ')[0]
    ].filter((strategy, index, arr) => 
      strategy && 
      strategy.length > 2 && 
      arr.indexOf(strategy) === index // Remove duplicates
    );

    for (const searchName of searchStrategies) {
      try {
        const cmsApiUrl = `https://data.cms.gov/provider-data/api/1/datastore/query/4pq5-n9py/0?conditions[0][resource]=facility_name&conditions[0][operator]=LIKE&conditions[0][value]=%25${encodeURIComponent(searchName)}%25&conditions[1][resource]=provider_state&conditions[1][operator]=%3D&conditions[1][value]=${encodeURIComponent(state)}&limit=10`;
        
        console.log(`Trying CMS API search: "${searchName}" in ${state}`);
        console.log(`CMS API URL: ${cmsApiUrl}`);
        
        const apiResponse = await fetch(cmsApiUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'CareIQ-Analysis-Tool/1.0'
          }
        });

        if (apiResponse.ok) {
          const cmsData = await apiResponse.json();
          console.log(`CMS API returned ${cmsData.results?.length || 0} results for "${searchName}"`);
          
          // Log all results for debugging
          if (cmsData.results && cmsData.results.length > 0) {
            console.log('All CMS results found:');
            cmsData.results.forEach((result, idx) => {
              console.log(`${idx + 1}. ${result.facility_name} - Overall: ${result.overall_rating} stars`);
            });

            // Find the best match with improved scoring
            let bestMatch = cmsData.results[0];
            let bestScore = 0;
            
            console.log(`🔍 Finding best match for "${facilityName}" among ${cmsData.results.length} results:`);
            
            // More sophisticated matching with detailed scoring
            for (const result of cmsData.results) {
              let score = 0;
              const resultName = result.facility_name?.toLowerCase() || '';
              const searchLower = facilityName.toLowerCase();
              
              // Normalize both names for better comparison
              const normalizeForComparison = (name) => {
                return name
                  .replace(/\b(nursing home|skilled nursing facility|SNF|rehabilitation center|rehab center|care center|health center|healthcare center|medical center|manor|villa|gardens|commons|residence|assisted living|memory care|long term care|LTC|the|of|at|in|a|an|and|&)\b/gi, '')
                  .replace(/[^\w\s]/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              };
              
              const normalizedResult = normalizeForComparison(resultName);
              const normalizedSearch = normalizeForComparison(searchLower);
              
              // Exact match (normalized) gets highest score
              if (normalizedResult === normalizedSearch) {
                score = 100;
                console.log(`  ✅ EXACT MATCH: "${result.facility_name}" (score: 100)`);
              }
              // Direct substring match
              else if (resultName.includes(searchLower) || searchLower.includes(resultName.substring(0, Math.min(resultName.length, searchLower.length * 0.8)))) {
                score = 85;
                console.log(`  ✅ SUBSTRING MATCH: "${result.facility_name}" (score: 85)`);
              }
              // Normalized substring match
              else if (normalizedResult.includes(normalizedSearch) || normalizedSearch.includes(normalizedResult)) {
                score = 75;
                console.log(`  ✅ NORMALIZED MATCH: "${result.facility_name}" (score: 75)`);
              }
              // Word matches with position weighting
              else {
                const searchWords = normalizedSearch.split(' ').filter(w => w.length > 2);
                const resultWords = normalizedResult.split(' ').filter(w => w.length > 2);
                
                let matchingWords = 0;
                let totalWords = searchWords.length;
                
                // Check for word matches (including partial)
                for (let i = 0; i < searchWords.length; i++) {
                  const searchWord = searchWords[i];
                  for (const resultWord of resultWords) {
                    // Exact word match
                    if (searchWord === resultWord) {
                      matchingWords += 1;
                      break;
                    }
                    // Partial word match (at least 4 characters)
                    else if (searchWord.length >= 4 && resultWord.length >= 4) {
                      if (searchWord.includes(resultWord) || resultWord.includes(searchWord)) {
                        matchingWords += 0.8;
                        break;
                      }
                    }
                  }
                }
                
                score = totalWords > 0 ? (matchingWords / totalWords) * 60 : 0;
                
                // Bonus for first word match (facility names often start with key identifier)
                if (searchWords.length > 0 && resultWords.length > 0) {
                  if (searchWords[0] === resultWords[0] || 
                      (searchWords[0].length >= 4 && resultWords[0].length >= 4 && 
                       (searchWords[0].includes(resultWords[0]) || resultWords[0].includes(searchWords[0])))) {
                    score += 15;
                  }
                }
                
                console.log(`  📊 WORD MATCH: "${result.facility_name}" - ${matchingWords.toFixed(1)}/${totalWords} words (score: ${score.toFixed(1)})`);
              }
              
              // Additional bonus for matching state
              if (result.provider_state === state) {
                score += 5;
              }
              
              // Penalty for very different lengths (likely different facilities)
              const lengthDiff = Math.abs(resultName.length - searchLower.length);
              if (lengthDiff > searchLower.length * 0.5) {
                score -= 10;
              }
              
              if (score > bestScore) {
                bestScore = score;
                bestMatch = result;
              }
            }
            
            console.log(`🎯 SELECTED: "${bestMatch.facility_name}" with score ${bestScore.toFixed(1)}`);
            
            // Only return result if score is above threshold
            if (bestScore < 30) {
              console.log(`❌ SCORE TOO LOW (${bestScore.toFixed(1)} < 30) - No confident match found`);
              continue; // Try next search strategy
            }
            
            console.log(`Selected best match: "${bestMatch.facility_name}" with score ${bestScore}`);
            console.log(`Facility ratings - Overall: ${bestMatch.overall_rating}, Health: ${bestMatch.survey_rating}, Staffing: ${bestMatch.staffing_rating}, Quality: ${bestMatch.quality_rating}`);
            
            return mapCMSDataToFacility(bestMatch, facilityName, state);
          } else {
            console.log(`No results found for search term: "${searchName}"`);
          }
        } else {
          console.log(`CMS API request failed with status: ${apiResponse.status}`);
        }
      } catch (apiError) {
        console.warn(`CMS API search failed for ${searchName}:`, apiError);
        continue; // Try next search strategy
      }
    }

    // If all searches fail, try to use WebFetch as a last resort
    try {
      const facilitySearchUrl = `https://www.medicare.gov/care-compare/?providerType=NursingHome&searchBy=location&query=${encodeURIComponent(`${facilityName} ${state}`)}`;
      
      // Note: This would require implementing WebFetch properly
      console.log(`Would try WebFetch for: ${facilitySearchUrl}`);
    } catch (webError) {
      console.warn('WebFetch attempt failed:', webError);
    }
      
    // If no results found, return demo data with clear indication
    console.error(`❌ NO FACILITY DATA FOUND for "${facilityName}" in ${state}`);
    console.error(`❌ RETURNING DEMO DATA - NOT REAL MEDICARE RATINGS`);
    return {
      name: `${facilityName} (DATA NOT FOUND)`,
      state: state,
      providerId: "NO_DATA_FOUND",
      // Demo data - NOT real Medicare ratings
      overallRating: null, // Show N/A to indicate no data
      healthInspections: null,
      qualityMeasures: null,
      staffing: null,
      lastUpdated: new Date().toISOString(),
      address: "123 Healthcare Way",
      city: "Demo City", 
      zipCode: "12345",
      phoneNumber: "(555) 123-4567",
      ownershipType: "For profit - Corporation",
      // 2025 Medicare staffing metrics
      staffingMetrics: {
        totalNursingHours: 4.2,
        rnHours: 0.8,
        lpnHours: 1.1,
        cnaHours: 2.3,
        staffTurnover: 0.65
      },
      // 2025 Medicare quality measures (9 key measures)
      qualityMetrics: {
        longStayAntipsychotics: 12.5,
        shortStayRehospitalization: 18.2,
        shortStayPressureUlcers: 1.8,
        longStayFalls: 4.9,
        longStayUTIs: 6.2,
        longStayPressureUlcers: 2.1,
        longStayPain: 3.4,
        shortStayAntipsychotics: 2.1,
        longStayPhysicalRestraints: 0.8
      },
      // 2025 Medicare inspection metrics
      inspectionMetrics: {
        totalDeficiencies: 12,
        weightedHealthSurveyScore: 42,
        fireSafetyDeficiencies: 2,
        complaintDeficiencies: 1
      },
      deficiencies: [
        "❌ COULD NOT FIND FACILITY DATA",
        "❌ Please verify facility name and state",
        "❌ Check Medicare.gov directly for accurate ratings"
      ],
      strengths: [
        "❌ NO REAL DATA AVAILABLE",
        "❌ Showing placeholder values only"
      ],
      isDemoData: true,
      dataNotFound: true
    };
  } catch (error) {
    console.error("Error searching facility:", error);
    
    // Fallback to demo data with realistic ratings if API fails
    return {
      name: facilityName,
      state: state,
      providerId: "ERROR_DEMO",
      // 2025 Medicare ratings structure
      overallRating: 3,
      healthInspections: 3,
      qualityMeasures: 3,
      staffing: 3,
      lastUpdated: new Date().toISOString(),
      address: "Address unavailable",
      city: "Unknown",
      zipCode: "00000",
      phoneNumber: "Contact facility directly",
      ownershipType: "Unknown",
      // 2025 Medicare staffing metrics (error state)
      staffingMetrics: {
        totalNursingHours: null,
        rnHours: null,
        lpnHours: null,
        cnaHours: null,
        staffTurnover: null
      },
      // 2025 Medicare quality measures (error state)
      qualityMetrics: {
        longStayAntipsychotics: null,
        shortStayRehospitalization: null,
        shortStayPressureUlcers: null,
        longStayFalls: null,
        longStayUTIs: null,
        longStayPressureUlcers: null,
        longStayPain: null,
        shortStayAntipsychotics: null,
        longStayPhysicalRestraints: null
      },
      // 2025 Medicare inspection metrics (error state)
      inspectionMetrics: {
        totalDeficiencies: 0,
        weightedHealthSurveyScore: 0,
        fireSafetyDeficiencies: 0,
        complaintDeficiencies: 0
      },
      deficiencies: ["Unable to retrieve detailed facility data from CMS Care Compare"],
      strengths: ["Contact CMS or check Medicare.gov directly for current facility ratings"],
      isDemoData: true,
      error: error.message
    };
  }
}

async function analyzeFacility(facilityData: any) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o";

  if (!OPENROUTER_API_KEY) {
    throw new Error("AI service not configured");
  }

  const basePrompt = `Analyze this nursing home facility's 2025 Medicare Care Compare data and provide specific improvement recommendations based on CMS 5-Star Rating System:

Facility: ${facilityData.name} (${facilityData.state})
Provider ID: ${facilityData.providerId}
Data Source: ${facilityData.dataSource || 'Standard CMS Data'}`;

  // Add scraped data if available
  const scrapedDataSection = facilityData.scrapedData ? `

=== RAW MEDICARE.GOV DATA ===
${facilityData.scrapedData}

=== END RAW DATA ===
` : '';

  const prompt = basePrompt + scrapedDataSection + `

=== 2025 MEDICARE 5-STAR RATINGS ===
Overall Rating: ${facilityData.overallRating}/5 stars (Primary CMS Rating)

Component Ratings:
• Health Inspections: ${facilityData.healthInspections}/5 stars (Based on 3 most recent comprehensive inspections)
• Staffing: ${facilityData.staffing}/5 stars (RN hours + total nursing hours per resident day)
• Quality Measures: ${facilityData.qualityMeasures}/5 stars (9 clinical quality measures)

=== DETAILED METRICS ===
Staffing Details:
• Total Nursing Hours: ${facilityData.staffingMetrics?.totalNursingHours || 'N/A'}
• RN Hours: ${facilityData.staffingMetrics?.rnHours || 'N/A'}
• Staff Turnover: ${facilityData.staffingMetrics?.staffTurnover || 'N/A'}

Inspection Details:
• Total Health Deficiencies: ${facilityData.inspectionMetrics?.totalDeficiencies || 0}
• Weighted Health Survey Score: ${facilityData.inspectionMetrics?.weightedHealthSurveyScore || 0}
• Fire Safety Deficiencies: ${facilityData.inspectionMetrics?.fireSafetyDeficiencies || 0}
• Complaint Deficiencies: ${facilityData.inspectionMetrics?.complaintDeficiencies || 0}

Quality Measures Performance:
• Long-Stay Antipsychotics: ${facilityData.qualityMetrics?.longStayAntipsychotics || 'N/A'}
• Short-Stay Rehospitalization: ${facilityData.qualityMetrics?.shortStayRehospitalization || 'N/A'}
• Falls with Injury: ${facilityData.qualityMetrics?.longStayFalls || 'N/A'}
• UTI Rates: ${facilityData.qualityMetrics?.longStayUTIs || 'N/A'}

Current Issues:
${facilityData.deficiencies.map((d: string) => `- ${d}`).join('\n') || '- No major deficiencies identified'}

Current Strengths:
${facilityData.strengths.map((s: string) => `- ${s}`).join('\n') || '- Review facility performance for strengths'}

=== CMS RATING CALCULATION RULES ===
- Overall rating starts with Health Inspections rating
- Add 1 star if Staffing is 4-5 stars and > Health Inspections rating  
- Subtract 1 star if Staffing is 1 star
- Add 1 star if Quality Measures is 5 stars, subtract 1 if it's 1 star
- If Health Inspections is 1 star, Overall can only be upgraded by 1 star maximum

Please provide a comprehensive analysis formatted as JSON with the following sections:

REQUIRED SECTIONS:
1. careCompareSummary: Detailed summary of facility's Care Compare performance vs. national averages
2. priorityAreas: Top 3-5 areas that will have biggest impact on overall star rating
3. starRatingStrategies: Specific tactics to improve each component rating (Health, Staffing, Quality)
4. complianceRecommendations: Health inspection and regulatory compliance actions
5. staffTraining: Training programs to improve staffing metrics and retention
6. qualityEnhancements: Clinical improvement strategies for the 9 quality measures
7. performanceTrends: Analysis of facility's performance trends and benchmarking
8. immediateActions: Top 3 actions to take within 30 days
9. longTermGoals: Strategic goals for 6-12 month improvement plan

Format as valid JSON with all sections included. Focus on specific, measurable, actionable recommendations.`;

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

export async function GET(req: NextRequest) {
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
    const supaService = supabaseService();
    const { data: profile, error: profileError } = await supaService
      .from("profiles")
      .select("facility_name, facility_state")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.facility_name) {
      return NextResponse.json({ 
        error: "Facility information not found" 
      }, { status: 400 });
    }

    // Get the most recent analysis for this facility and user
    const { data: existingAnalysis, error: fetchError } = await supa
      .from('knowledge_base')
      .select('*')
      .eq('metadata->>content_type', 'facility_analysis')
      .eq('metadata->>user_id', user.id)
      .eq('metadata->>facility_name', profile.facility_name)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !existingAnalysis) {
      return NextResponse.json({ 
        success: false, 
        message: "No existing analysis found" 
      }, { status: 404 });
    }

    // Parse and return the stored analysis
    try {
      const analysisData = JSON.parse(existingAnalysis.content);
      return NextResponse.json({ 
        success: true, 
        data: analysisData,
        lastGenerated: existingAnalysis.last_updated
      });
    } catch (parseError) {
      return NextResponse.json({ 
        error: "Failed to parse stored analysis" 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Get facility analysis error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to retrieve facility analysis" 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.FACILITY_ANALYSIS);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this is a refresh request
    const body = await req.json().catch(() => ({}));
    const isRefresh = body.refresh === true;

    // Get user profile for facility information using service role to bypass RLS
    const supaService = supabaseService();
    const { data: profile, error: profileError } = await supaService
      .from("profiles")
      .select("facility_name, facility_state")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.facility_name || !profile?.facility_state) {
      return NextResponse.json({ 
        error: "Facility information not found. Please update your profile with facility name and state." 
      }, { status: 400 });
    }

    // Always check for existing analysis first (unless it's a forced refresh)
    if (!isRefresh) {
      const { data: existingAnalysis } = await supa
        .from('knowledge_base')
        .select('*')
        .eq('metadata->>content_type', 'facility_analysis')
        .eq('metadata->>user_id', user.id)
        .eq('metadata->>facility_name', profile.facility_name)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (existingAnalysis) {
        const lastUpdate = new Date(existingAnalysis.last_updated);
        const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
        
        // If analysis is less than 7 days old, return existing analysis
        if (daysSinceUpdate < 7) {
          try {
            const analysisData = JSON.parse(existingAnalysis.content);
            return NextResponse.json({ 
              success: true, 
              data: analysisData,
              fromCache: true,
              lastGenerated: existingAnalysis.last_updated,
              nextUpdate: new Date(lastUpdate.getTime() + (7 * 24 * 60 * 60 * 1000)).toISOString()
            });
          } catch (parseError) {
            // If parse fails, continue with new generation
            console.error('Failed to parse existing analysis, generating new one:', parseError);
          }
        }
      }
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

    // Save or update the analysis in the knowledge_base for persistence
    try {
      // Check if we already have an analysis for this facility
      const { data: existingRecord } = await supa
        .from('knowledge_base')
        .select('id')
        .eq('metadata->>content_type', 'facility_analysis')
        .eq('metadata->>user_id', user.id)
        .eq('metadata->>facility_name', profile.facility_name)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      const analysisData = {
        facility_id: profile.facility_name,
        category: 'Facility Policy',
        title: `Facility Performance Analysis - ${profile.facility_name}`,
        content: JSON.stringify(result),
        metadata: {
          content_type: 'facility_analysis',
          facility_name: profile.facility_name,
          facility_state: profile.facility_state,
          user_id: user.id,
          generated_at: result.generatedAt
        },
        source_url: null,
        last_updated: new Date().toISOString()
      };

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
    } catch (saveError) {
      console.error('Failed to save facility analysis:', saveError);
      // Continue even if save fails
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error("Facility analysis error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to analyze facility" 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    const supaService = supabaseService();
    const { data: profile, error: profileError } = await supaService
      .from("profiles")
      .select("facility_name, facility_state")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.facility_name) {
      return NextResponse.json({ 
        error: "Facility information not found" 
      }, { status: 400 });
    }

    // Delete existing analysis
    const { error: deleteError } = await supa
      .from('knowledge_base')
      .delete()
      .eq('metadata->>content_type', 'facility_analysis')
      .eq('metadata->>user_id', user.id)
      .eq('metadata->>facility_name', profile.facility_name);

    if (deleteError) {
      console.error('Failed to delete facility analysis:', deleteError);
      return NextResponse.json({ 
        error: "Failed to clear analysis" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Analysis cleared successfully" 
    });

  } catch (error: any) {
    console.error("Delete facility analysis error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to clear facility analysis" 
    }, { status: 500 });
  }
}