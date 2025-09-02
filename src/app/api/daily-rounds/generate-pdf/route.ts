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

    const aiResponse = await provider.complete([{ role: "user", content: aiPrompt }], {
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
    
    // Generate professional HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { 
            size: A4; 
            margin: 0.4in; 
        }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 11px; 
            line-height: 1.4; 
            margin: 0; 
            padding: 0;
            color: #333;
        }
        
        /* Professional Header */
        .facility-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 20px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .facility-info {
            flex: 1;
        }
        
        .facility-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 3px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .facility-subtitle {
            font-size: 12px;
            opacity: 0.9;
        }
        
        .logo-space {
            width: 80px;
            height: 60px;
            background: rgba(255,255,255,0.1);
            border: 2px dashed rgba(255,255,255,0.3);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: rgba(255,255,255,0.7);
            text-align: center;
            line-height: 1.2;
        }
        
        /* Round Details */
        .round-details {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .round-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 8px;
        }
        
        .round-meta {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            font-size: 10px;
        }
        
        .round-meta-item {
            display: flex;
            flex-direction: column;
        }
        
        .round-meta-label {
            font-weight: bold;
            color: #475569;
            margin-bottom: 2px;
        }
        
        .round-meta-value {
            color: #1e293b;
            font-weight: 500;
        }
        
        /* Checklist Items */
        .checklist {
            margin-bottom: 25px;
        }
        
        .checklist-item {
            display: flex;
            align-items: flex-start;
            padding: 12px;
            margin-bottom: 8px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            break-inside: avoid;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .item-checkbox {
            width: 16px;
            height: 16px;
            border: 2px solid #64748b;
            border-radius: 3px;
            margin-right: 12px;
            margin-top: 2px;
            flex-shrink: 0;
            position: relative;
        }
        
        .item-checkbox::after {
            content: "";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 8px;
            background: transparent;
            border-radius: 1px;
        }
        
        .item-content {
            flex: 1;
            min-width: 0;
        }
        
        .item-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .item-text {
            font-weight: 500;
            color: #1e293b;
            line-height: 1.3;
            flex: 1;
            margin-right: 10px;
        }
        
        .item-number {
            font-weight: bold;
            color: #3b82f6;
            margin-right: 6px;
        }
        
        .item-badges {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }
        
        .compliance-badge {
            background: #dc2626;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
            letter-spacing: 0.5px;
        }
        
        .priority-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: bold;
        }
        
        .priority-high { background: #fecaca; color: #7f1d1d; }
        .priority-medium { background: #fef3c7; color: #92400e; }
        .priority-low { background: #d1fae5; color: #065f46; }
        
        .item-notes {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 8px;
            margin-top: 8px;
            min-height: 20px;
            position: relative;
        }
        
        .notes-label {
            position: absolute;
            top: -6px;
            left: 8px;
            background: white;
            padding: 0 4px;
            font-size: 8px;
            color: #64748b;
            font-weight: 500;
        }
        
        .notes-lines {
            height: 20px;
            background-image: repeating-linear-gradient(
                transparent,
                transparent 9px,
                #cbd5e1 9px,
                #cbd5e1 10px
            );
        }
        
        /* Signature Section */
        .signature-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-top: 25px;
        }
        
        .signature-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 15px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 5px;
        }
        
        .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .signature-field {
            display: flex;
            flex-direction: column;
        }
        
        .field-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 5px;
            font-size: 10px;
        }
        
        .field-line {
            border-bottom: 1px solid #64748b;
            height: 25px;
            position: relative;
        }
        
        .general-notes {
            margin-top: 15px;
        }
        
        .general-notes-area {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            height: 60px;
            background-image: repeating-linear-gradient(
                transparent,
                transparent 14px,
                #e2e8f0 14px,
                #e2e8f0 15px
            );
        }
        
        /* Print optimizations */
        @media print {
            body { font-size: 10px; }
            .facility-header { background: #1e3a8a !important; -webkit-print-color-adjust: exact; }
            .checklist-item { break-inside: avoid; }
            .signature-section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <!-- Professional Header -->
    <div class="facility-header">
        <div class="facility-info">
            <div class="facility-name">${roundData.metadata.facility_name}</div>
            <div class="facility-subtitle">Daily Round Checklist System</div>
        </div>
        <div class="logo-space">
            FACILITY<br>LOGO
        </div>
    </div>
    
    <!-- Round Details -->
    <div class="round-details">
        <div class="round-title">${roundData.title}</div>
        <div class="round-meta">
            <div class="round-meta-item">
                <div class="round-meta-label">DATE</div>
                <div class="round-meta-value">${dateText.replace('Generated: ', '').replace('Date: ', '')}</div>
            </div>
            <div class="round-meta-item">
                <div class="round-meta-label">UNIT</div>
                <div class="round-meta-value">${roundData.unit}</div>
            </div>
            <div class="round-meta-item">
                <div class="round-meta-label">SHIFT</div>
                <div class="round-meta-value">${roundData.shift}</div>
            </div>
            <div class="round-meta-item">
                <div class="round-meta-label">ITEMS</div>
                <div class="round-meta-value">${roundData.items.length} Tasks</div>
            </div>
        </div>
    </div>
    
    <!-- Checklist Items -->
    <div class="checklist">
        ${roundData.items.map((item: RoundItem, index: number) => `
            <div class="checklist-item">
                <div class="item-checkbox"></div>
                <div class="item-content">
                    <div class="item-header">
                        <div class="item-text">
                            <span class="item-number">${index + 1}.</span>
                            ${item.task}
                        </div>
                        <div class="item-badges">
                            ${item.compliance_related ? '<span class="compliance-badge">COMPLIANCE</span>' : ''}
                            <span class="priority-badge priority-${item.priority || 'medium'}">${(item.priority || 'medium').toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="item-notes">
                        <div class="notes-label">Notes / Comments</div>
                        <div class="notes-lines"></div>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section">
        <div class="signature-title">Round Completion & Sign-off</div>
        
        <div class="signature-grid">
            <div class="signature-field">
                <div class="field-label">STAFF MEMBER NAME</div>
                <div class="field-line"></div>
            </div>
            <div class="signature-field">
                <div class="field-label">SIGNATURE</div>
                <div class="field-line"></div>
            </div>
            <div class="signature-field">
                <div class="field-label">DATE COMPLETED</div>
                <div class="field-line"></div>
            </div>
            <div class="signature-field">
                <div class="field-label">TIME COMPLETED</div>
                <div class="field-line"></div>
            </div>
        </div>
        
        <div class="general-notes">
            <div class="field-label">GENERAL NOTES / ISSUES IDENTIFIED</div>
            <div class="general-notes-area"></div>
        </div>
    </div>
</body>
</html>`;

    console.log("Starting PDF generation with working Puppeteer setup...");
    console.log("Environment:", process.env.NODE_ENV);
    console.log("Platform:", process.platform);
    
    try {
      console.log("Getting Chromium executable path...");
      const execPath = await chromium.executablePath();
      console.log("Chromium executable path:", execPath);
      
      console.log("Launching browser with working config...");
      // Use the exact same config that works in test-pdf
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

      console.log("Browser launched successfully");

      try {
        console.log("Creating new page...");
        const page = await browser.newPage();
        console.log("Setting page content...");
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        console.log("Generating PDF...");
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