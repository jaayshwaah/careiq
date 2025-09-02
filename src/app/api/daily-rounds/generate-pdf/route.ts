// src/app/api/daily-rounds/generate-pdf/route.ts - AI-powered PDF generation for daily rounds
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { providerFromEnv } from "@/lib/ai/providers";
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RoundItem {
  id: string;
  category: string;
  task: string;
  frequency: string;
  priority: 'high' | 'medium' | 'low';
  compliance_related: boolean;
  notes?: string;
}

interface DailyRound {
  id: string;
  title: string;
  unit: string;
  shift: string;
  created_at: string;
  items: RoundItem[];
  metadata: {
    facility_name: string;
    template_type: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    console.log("Daily rounds PDF generation started...");
    
    // Try Bearer token first, then fall back to cookie auth
    const authHeader = req.headers.get("authorization") || undefined;
    console.log("Auth header:", authHeader ? "present" : "missing");
    
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    
    // Try both auth methods
    let supa = supabaseServerWithAuth(accessToken);
    let { data: { user }, error: userError } = await supa.auth.getUser();
    
    // If Bearer token fails, try cookie-based auth
    if (userError || !user) {
      console.log("Bearer auth failed, trying cookie auth...");
      supa = supabaseServerWithAuth(undefined); // No token = cookie auth
      const result = await supa.auth.getUser();
      user = result.data.user;
      userError = result.error;
    }
    
    console.log("User auth result:", { user: !!user, error: userError?.message });
    
    if (userError || !user) {
      console.log("All authentication methods failed, returning 401");
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { roundData, format = 'single-page', includeDate = false, customDate = null } = body;

    if (!roundData || !roundData.items) {
      return NextResponse.json({ ok: false, error: "Invalid round data" }, { status: 400 });
    }

    // Generate optimized PDF layout using AI
    const provider = providerFromEnv();
    const aiPrompt = `Create a professional, single-page PDF layout for this daily round checklist. Focus on:
1. Compact, readable formatting that fits everything on one page
2. Professional healthcare facility appearance
3. Clear checkboxes and completion fields
4. Organized by category with proper spacing
5. Include signature and notes sections at bottom
6. DO NOT specify any fonts or font families - use plain text only

Daily Round Data:
Title: ${roundData.title}
Unit: ${roundData.unit}
Shift: ${roundData.shift}
Facility: ${roundData.metadata.facility_name}

Items (${roundData.items.length} total):
${roundData.items.map((item: RoundItem, index: number) => `
${index + 1}. ${item.task}
   Category: ${item.category}${item.compliance_related ? ' | COMPLIANCE REQUIRED ⚠️' : ''}
   ${item.notes ? `Notes: ${item.notes}` : ''}
`).join('')}

Return a JSON response with:
{
  "layout": "optimized", 
  "sections": [
    {"type": "header", "content": "formatted header"},
    {"type": "items", "content": "formatted checklist items"},
    {"type": "footer", "content": "signature and notes section"}
  ]
}`;

    const aiResponse = await provider.generateText({
      messages: [{ role: "user", content: aiPrompt }],
      max_tokens: 2000
    });

    let pdfLayout;
    try {
      // Try to parse AI response as JSON
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '');
      pdfLayout = JSON.parse(cleanedResponse);
    } catch (parseError) {
      // Fallback to default layout if AI response isn't parseable
      console.warn('Failed to parse AI layout, using default:', parseError);
      pdfLayout = {
        layout: "default",
        sections: [
          {
            type: "header",
            content: `DAILY ROUND CHECKLIST\n${roundData.title}\nGenerated: ${new Date().toLocaleDateString()}\nUnit: ${roundData.unit} | Shift: ${roundData.shift}`
          },
          {
            type: "items",
            content: roundData.items.map((item: RoundItem, index: number) => 
              `${index + 1}. ☐ ${item.task}\n   ${item.category}${item.compliance_related ? ' | ⚠️ COMPLIANCE' : ''}`
            ).join('\n\n')
          },
          {
            type: "footer",
            content: "Staff Signature: _____________________ Date: __________\n\nNotes/Issues Identified:\n_________________________________________________\n_________________________________________________"
          }
        ]
      };
    }

    // Create PDF using simple HTML approach to avoid font loading issues
    const dateText = includeDate 
      ? `Date: ${customDate || new Date().toLocaleDateString()}` 
      : `Generated: ${new Date().toLocaleDateString()}`;
    
    // Calculate font sizes for single page fit
    const itemCount = roundData.items.length;
    const baseFontSize = Math.max(8, Math.min(12, 600 / itemCount));
    const useColumns = itemCount > 20;
    
    // Generate HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { 
            size: A4; 
            margin: 0.5in; 
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: ${baseFontSize}px; 
            line-height: 1.2; 
            margin: 0; 
            padding: 0;
        }
        .header { 
            text-align: center; 
            margin-bottom: 15px; 
        }
        .title { 
            font-size: ${Math.min(16, baseFontSize + 4)}px; 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .subtitle { 
            font-size: ${baseFontSize + 1}px; 
            margin-bottom: 10px; 
        }
        .info { 
            font-size: ${baseFontSize}px; 
            margin-bottom: 15px; 
        }
        .items { 
            ${useColumns ? 'columns: 2; column-gap: 20px;' : ''}
            margin-bottom: 15px;
        }
        .item { 
            break-inside: avoid; 
            margin-bottom: 8px; 
            font-size: ${baseFontSize}px;
        }
        .compliance { 
            color: #d2691e; 
            font-weight: bold; 
        }
        .footer { 
            margin-top: 20px; 
            font-size: ${baseFontSize}px;
            border-top: 1px solid #ccc; 
            padding-top: 10px;
        }
        .checkbox { 
            font-family: monospace; 
            margin-right: 5px; 
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">DAILY ROUND CHECKLIST</div>
        <div class="subtitle">${roundData.title}</div>
        <div class="info">${dateText} | Unit: ${roundData.unit} | Shift: ${roundData.shift} | ${roundData.metadata.facility_name}</div>
    </div>
    
    <div class="items">
        ${roundData.items.map((item: RoundItem, index: number) => `
            <div class="item">
                <span class="checkbox">☐</span>
                <strong>${index + 1}.</strong> ${item.task}
                ${item.compliance_related ? '<span class="compliance"> [COMPLIANCE]</span>' : ''}
            </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <div>Staff Signature: _________________________ Date: _____________ Time: _________</div>
        <br>
        <div>Notes: _________________________________________________</div>
        <div>_______________________________________________________</div>
    </div>
</body>
</html>`;

    // Try Puppeteer PDF generation, fallback to HTML in development
    const isProduction = process.env.NODE_ENV === 'production';
    
    try {
      // Generate PDF using Puppeteer with Chromium for serverless
      const browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--hide-scrollbars',
          '--disable-web-security',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });

      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.5in',
            left: '0.5in'
          },
          printBackground: true
        });

        await browser.close();

        console.log("PDF generated successfully, buffer size:", pdfBuffer.length);

        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="daily-rounds-${roundData.unit}-${roundData.shift}-${new Date().toISOString().split('T')[0]}.pdf"`,
          },
        });

      } catch (pdfError) {
        await browser.close();
        throw pdfError;
      }

    } catch (puppeteerError) {
      console.warn('Puppeteer failed, falling back to HTML:', puppeteerError.message);
      
      // Fallback to HTML for development or when Puppeteer fails
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `inline; filename="daily-rounds-${roundData.unit}-${roundData.shift}-${new Date().toISOString().split('T')[0]}.html"`,
        },
      });
    }

  } catch (error: any) {
    console.error("PDF generation error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate PDF" 
    }, { status: 500 });
  }
}