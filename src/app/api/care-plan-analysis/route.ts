import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { parseDocxToText, parsePdfToText } from "@/lib/knowledge/parse";
import { providerFromEnv } from "@/lib/modelRouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CarePlanAnalysis {
  residentName: string;
  diagnosis: string[];
  careGoals: string[];
  interventions: string[];
  medications: string[];
  assessments: string[];
  familyInvolvement: string;
  complianceIssues: string[];
  recommendations: string[];
  nextReviewDate: string;
  riskFactors: string[];
  qualityMeasures: string[];
}

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  if (file.type === 'text/plain') {
    return buffer.toString('utf-8');
  }
  
  if (file.type === 'application/pdf') {
    return await parsePdfToText(buffer);
  }
  
  if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    return await parseDocxToText(buffer);
  }
  
  // Try to treat as plain text
  return buffer.toString('utf-8');
}

async function analyzeCarePlan(text: string): Promise<CarePlanAnalysis> {
  const provider = providerFromEnv();
  
  const prompt = `Analyze this nursing home care plan document and extract comprehensive information. Provide a structured analysis in JSON format:

CARE PLAN DOCUMENT:
${text}

Please extract and analyze the following information:
1. Resident name
2. Primary and secondary diagnoses
3. Care goals and objectives
4. Nursing interventions and care activities
5. Medications and treatments
6. Assessment requirements and schedules
7. Family involvement and communication
8. Compliance issues or gaps
9. Recommendations for improvement
10. Next care plan review date
11. Risk factors and safety concerns
12. Quality measures and outcomes

Return ONLY a JSON object with this structure:
{
  "residentName": "string",
  "diagnosis": ["string"],
  "careGoals": ["string"],
  "interventions": ["string"],
  "medications": ["string"],
  "assessments": ["string"],
  "familyInvolvement": "string",
  "complianceIssues": ["string"],
  "recommendations": ["string"],
  "nextReviewDate": "string",
  "riskFactors": ["string"],
  "qualityMeasures": ["string"]
}`;

  const response = await provider.complete([
    {
      role: "system",
      content: "You are a skilled nursing home care plan expert analyzing resident care plans. Extract comprehensive information and provide structured analysis in JSON format only. Focus on CMS compliance, quality measures, and resident safety."
    },
    {
      role: "user",
      content: prompt
    }
  ], {
    temperature: 0.3,
    max_tokens: 3000,
  });

  try {
    const analysisText = response.choices?.[0]?.message?.content || "";
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        residentName: analysis.residentName || "Unknown",
        diagnosis: Array.isArray(analysis.diagnosis) ? analysis.diagnosis : [],
        careGoals: Array.isArray(analysis.careGoals) ? analysis.careGoals : [],
        interventions: Array.isArray(analysis.interventions) ? analysis.interventions : [],
        medications: Array.isArray(analysis.medications) ? analysis.medications : [],
        assessments: Array.isArray(analysis.assessments) ? analysis.assessments : [],
        familyInvolvement: analysis.familyInvolvement || "Not specified",
        complianceIssues: Array.isArray(analysis.complianceIssues) ? analysis.complianceIssues : [],
        recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : [],
        nextReviewDate: analysis.nextReviewDate || "Not specified",
        riskFactors: Array.isArray(analysis.riskFactors) ? analysis.riskFactors : [],
        qualityMeasures: Array.isArray(analysis.qualityMeasures) ? analysis.qualityMeasures : []
      };
    }
  } catch (error) {
    console.error('Error parsing care plan analysis:', error);
  }

  // Fallback analysis if JSON parsing fails
  return {
    residentName: "Analysis Error",
    diagnosis: ["Unable to extract diagnoses"],
    careGoals: ["Unable to extract care goals"],
    interventions: ["Unable to extract interventions"],
    medications: ["Unable to extract medications"],
    assessments: ["Unable to extract assessments"],
    familyInvolvement: "Unable to extract family involvement information",
    complianceIssues: ["Unable to analyze compliance"],
    recommendations: ["Please review the document manually"],
    nextReviewDate: "Not specified",
    riskFactors: ["Unable to assess risk factors"],
    qualityMeasures: ["Unable to extract quality measures"]
  };
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.DOCUMENT_ANALYSIS);
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      return NextResponse.json({ 
        error: "Unsupported file type. Please upload PDF, Word document, or text file." 
      }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json({ 
        error: "File too large. Maximum size is 50MB." 
      }, { status: 400 });
    }

    // Extract text from file
    const text = await extractTextFromFile(file);
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: "Could not extract text from file or file is empty." 
      }, { status: 400 });
    }

    // Analyze the care plan
    const analysis = await analyzeCarePlan(text);

    return NextResponse.json({ 
      success: true, 
      analysis,
      filename: file.name,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Care plan analysis error:', error);
    return NextResponse.json({ 
      error: "Failed to analyze care plan document" 
    }, { status: 500 });
  }
}
