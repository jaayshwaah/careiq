import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimit(req, RATE_LIMITS.CHAT);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { content } = await req.json();
    
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Call OpenRouter API for PBJ correction
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://careiq.vercel.app',
        'X-Title': process.env.OPENROUTER_SITE_NAME || 'CareIQ',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert PBJ (Payroll-Based Journal) data correction specialist following PBJ 4.00.0 specifications. Your task is to:

1. Analyze the provided PBJ XML data for errors and formatting issues per CMS standards
2. Correct any data validation errors, formatting inconsistencies, and compliance issues
3. Ensure the XML is properly formatted and ready for CMS submission
4. Provide a detailed summary of all corrections made

**PBJ 4.00.0 Critical Requirements:**

**File Structure:**
- Root element: <nursingHomeData> with proper namespace
- fileSpecVersion="4.00.0" (required as of June 2, 2020)
- ASCII encoding only, no extended ASCII characters
- Header section mandatory, Employee and/or Staffing Hours required

**Header Requirements:**
- facilityId: Alphanumeric, max 30 characters
- stateCode: Valid 2-letter state abbreviation
- reportQuarter: Must be 1, 2, 3, or 4
- federalFiscalYear: Range 2016-9999
- softwareVendorName, softwareVendorEmail, softwareProductName: Required
- softwareProductVersion: Optional

**Employee Section:**
- employeeId: Unique, alphanumeric, max 30 characters
- hireDate, terminationDate: YYYY-MM-DD format or remove tag entirely if no value

**Staffing Hours Section:**
- processType: "merge" or "replace" (required)
- employeeId: Must match employee in Employee section
- date: YYYY-MM-DD format
- hours: Numeric, decimal allowed
- jobTitleCode: Must be 1-40 (see labor categories below)
- payTypeCode: 1=Exempt, 2=Non-Exempt, 3=Contract

**Labor Categories (Job Title Codes 1-40):**
1-2: Administration, 3-14: Nursing, 15: Pharmacy, 16-17: Dietary, 18-31: Therapeutic, 
32: Dental (Optional), 33: Podiatry (Optional), 34: Mental Health, 35: Vocational (Optional), 
36: Clinical Lab, 37: Diagnostic X-ray, 38: Blood Services (Optional), 39: Housekeeping (Optional), 40: Other (Optional)

**Validation Rules:**
- No blank values allowed - remove tags entirely if no value
- Leading/trailing blanks will be trimmed
- Text converted to uppercase except email addresses
- Special characters must use XML entity references (&apos;, &quot;, &lt;, &gt;, &amp;)
- Dates must be YYYY-MM-DD format
- Hours must be numeric (no negative values)
- Employee IDs must be unique within the file

**Common Issues to Fix:**
- Invalid job title codes (must be 1-40)
- Invalid pay type codes (must be 1-3)
- Incorrect date formats
- Missing required fields
- Blank values (remove tags instead)
- XML formatting errors
- Duplicate employee IDs
- Invalid state codes
- Out-of-range fiscal years
- Missing processType attribute

Return your response as a JSON object with this exact structure:
{
  "correctedXml": "the corrected XML content",
  "summary": {
    "totalCorrections": number,
    "errors": number,
    "warnings": number,
    "info": number,
    "corrections": [
      {
        "type": "error" | "warning" | "info",
        "field": "field name or element",
        "original": "original value",
        "corrected": "corrected value",
        "reason": "explanation of the correction"
      }
    ]
  }
}`
          },
          {
            role: 'user',
            content: `Please correct and format this PBJ XML data:\n\n${content}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'AI service unavailable',
        details: `OpenRouter API error: ${response.status} - ${errorText}`
      }, { status: 503 });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    try {
      // Parse the AI response as JSON
      const result = JSON.parse(aiResponse);
      
      // Validate the response structure
      if (!result.correctedXml || !result.summary) {
        throw new Error('Invalid response structure');
      }

      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('AI response:', aiResponse);
      
      // Fallback: return the raw response wrapped in the expected structure
      return NextResponse.json({
        correctedXml: aiResponse,
        summary: {
          totalCorrections: 0,
          errors: 0,
          warnings: 0,
          info: 1,
          corrections: [{
            type: 'info',
            field: 'AI Response',
            original: 'Raw AI response',
            corrected: 'Formatted response',
            reason: 'AI response could not be parsed as structured data'
          }]
        }
      });
    }

  } catch (error) {
    console.error('PBJ corrector error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
