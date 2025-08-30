// src/app/api/incident-reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimiter";
import { providerFromEnv } from "@/lib/ai/providers";

export const runtime = "nodejs";

interface IncidentSummary {
  incidentType: string;
  severity: string;
  location: string;
  dateTime: string;
  residentsInvolved: number;
  staffInvolved: string[];
  keyFindings: string[];
  rootCauses: string[];
  correctiveActions: string[];
  preventionStrategies: string[];
  regulatoryImpact: string;
  followUpRequired: boolean;
}

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  if (file.type === 'text/plain') {
    return buffer.toString('utf-8');
  }
  
  if (file.type === 'application/pdf') {
    // For PDF files, we'll need to use a PDF parser
    // For now, return an instruction to manually extract text
    throw new Error('PDF processing requires additional setup. Please convert to text format or upload as .txt file.');
  }
  
  if (file.type.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
    // For Word documents, we'll need to use a Word parser
    throw new Error('Word document processing requires additional setup. Please convert to text format or upload as .txt file.');
  }
  
  // Try to treat as plain text
  return buffer.toString('utf-8');
}

async function analyzeIncidentReport(text: string): Promise<IncidentSummary> {
  const provider = providerFromEnv();
  
  const prompt = `Analyze this incident report and extract key information. Provide a structured analysis in JSON format:

INCIDENT REPORT:
${text}

Please extract and analyze the following information:
1. Incident type/category
2. Severity level (Critical, Major, Moderate, Minor)
3. Location where incident occurred
4. Date and time of incident
5. Number of residents involved
6. Staff members involved
7. Key findings from the report
8. Root causes identified
9. Corrective actions recommended
10. Prevention strategies
11. Potential regulatory impact
12. Whether follow-up is required

Return ONLY a JSON object with this structure:
{
  "incidentType": "string",
  "severity": "Critical|Major|Moderate|Minor",
  "location": "string",
  "dateTime": "string",
  "residentsInvolved": number,
  "staffInvolved": ["string"],
  "keyFindings": ["string"],
  "rootCauses": ["string"],
  "correctiveActions": ["string"],
  "preventionStrategies": ["string"],
  "regulatoryImpact": "string describing potential regulatory implications",
  "followUpRequired": boolean
}`;

  const response = await provider.complete([
    {
      role: "system",
      content: "You are a nursing home compliance expert analyzing incident reports. Extract key information and provide structured analysis in JSON format only. Be thorough but concise."
    },
    {
      role: "user",
      content: prompt
    }
  ], {
    temperature: 0.3,
    max_tokens: 2000,
  });

  try {
    const analysisText = response.choices?.[0]?.message?.content || "";
    
    // Try to extract JSON from the response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!analysis.incidentType || !analysis.severity) {
      throw new Error("Missing required fields in analysis");
    }
    
    return analysis;
  } catch (error) {
    console.error("Failed to parse AI analysis:", error);
    
    // Return a fallback analysis
    return {
      incidentType: "Unable to determine",
      severity: "Minor",
      location: "Not specified",
      dateTime: "Not specified", 
      residentsInvolved: 0,
      staffInvolved: [],
      keyFindings: ["Analysis could not be completed automatically"],
      rootCauses: ["Manual review required"],
      correctiveActions: ["Review incident report manually", "Consult with compliance team"],
      preventionStrategies: ["Implement additional training if needed"],
      regulatoryImpact: "Manual review required to determine regulatory implications",
      followUpRequired: true
    };
  }
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
    const reportId = formData.get('reportId') as string;

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

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ 
        error: "File too large. Maximum size is 10MB." 
      }, { status: 400 });
    }

    // Extract text from file
    const text = await extractTextFromFile(file);
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: "Could not extract text from file or file is empty." 
      }, { status: 400 });
    }

    // Analyze the incident report
    const summary = await analyzeIncidentReport(text);

    // Store the analysis in database (optional - for now just return it)
    // TODO: Store in database for historical tracking
    
    return NextResponse.json({ 
      success: true, 
      reportId,
      summary,
      generatedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Incident report analysis error:", error);
    
    if (error.message.includes('PDF processing') || error.message.includes('Word document')) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: error.message || "Failed to analyze incident report" 
    }, { status: 500 });
  }
}