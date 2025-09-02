// src/app/api/daily-rounds/generate-pdf/route.ts - AI-powered PDF generation for daily rounds
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { providerFromEnv } from "@/lib/ai/providers";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
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

    // Create PDF using PDFKit with optimized settings for single page
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 40, right: 40 },
      bufferPages: true
    });
    
    // Use only built-in fonts that don't require file loading
    doc.font('Helvetica');

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Calculate available space and font sizes for optimal single-page fit
    const pageHeight = doc.page.height - 60; // Account for margins
    const availableHeight = pageHeight - 120; // Reserve space for header and footer
    const itemCount = roundData.items.length;
    
    // Dynamically calculate font sizes based on content
    const baseItemHeight = Math.max(12, Math.min(20, availableHeight / (itemCount + 5))); // +5 for header/footer
    const titleFontSize = Math.min(16, baseItemHeight + 4);
    const itemFontSize = Math.max(7, Math.min(10, baseItemHeight * 0.6));
    
    let currentY = 40;

    // Compact Header
    doc.fontSize(titleFontSize).text('DAILY ROUND CHECKLIST', 40, currentY, { align: 'center' });
    currentY += titleFontSize + 5;
    
    doc.fontSize(itemFontSize + 2).text(roundData.title, 40, currentY, { align: 'center' });
    currentY += itemFontSize + 8;
    
    // Single line for date and facility info
    const dateText = includeDate 
      ? `Date: ${customDate || new Date().toLocaleDateString()}` 
      : `Generated: ${new Date().toLocaleDateString()}`;
    
    doc.fontSize(itemFontSize)
      .text(`${dateText} | Unit: ${roundData.unit} | Shift: ${roundData.shift} | ${roundData.metadata.facility_name}`, 40, currentY, { align: 'center' });
    currentY += itemFontSize + 8;

    // Compact Items List - Two columns if space allows
    const totalItems = roundData.items.length;
    const useColumns = totalItems > 15; // Use columns for many items
    const columnWidth = useColumns ? 250 : 500;
    const rightColumnX = 300;
    
    let leftColumnY = currentY;
    let rightColumnY = currentY;
    let itemIndex = 1;
    
    roundData.items.forEach((item: RoundItem, index: number) => {
      const useRightColumn = useColumns && index >= Math.ceil(totalItems / 2);
      const itemX = useRightColumn ? rightColumnX : 40;
      const itemY = useRightColumn ? rightColumnY : leftColumnY;
      
      // Compact item format - single line per item
      const taskText = `${itemIndex}. ☐ ${item.task}`;
      const complianceText = item.compliance_related ? ' [COMPLIANCE]' : '';
      const fullText = taskText + complianceText;
      
      doc.fontSize(itemFontSize).text(fullText, itemX, itemY, { 
        width: columnWidth,
        height: baseItemHeight
      });
      
      // Update Y position
      if (useRightColumn) {
        rightColumnY += baseItemHeight;
      } else {
        leftColumnY += baseItemHeight;
      }
      
      itemIndex++;
    });
    
    // Update currentY to the lower of the two columns
    currentY = Math.max(leftColumnY, rightColumnY) + 10;

    // Compact Footer - only if space remains
    const remainingSpace = pageHeight - currentY;
    if (remainingSpace > 40) {
      doc.fontSize(itemFontSize)
        .text('Staff Signature: _________________________ Date: _____________ Time: _________', 40, currentY);
      currentY += itemFontSize + 5;
      
      if (remainingSpace > 60) {
        doc.text('Notes: _________________________________________________', 40, currentY);
        currentY += itemFontSize + 5;
        doc.text('_______________________________________________________', 40, currentY);
      }
    }

    // Add CareIQ logo watermark
    try {
      const logoPath = path.join(process.cwd(), 'public', 'careiq-logo.png');
      if (fs.existsSync(logoPath)) {
        // Add subtle watermark in bottom right
        doc.opacity(0.1); // Very light watermark
        doc.image(logoPath, doc.page.width - 150, doc.page.height - 150, {
          fit: [100, 100],
          align: 'center',
          valign: 'center'
        });
        doc.opacity(1); // Reset opacity
      }
    } catch (error) {
      console.warn('Could not add logo watermark:', error);
    }

    doc.end();
    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="daily-rounds-${roundData.unit}-${roundData.shift}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to generate PDF" 
    }, { status: 500 });
  }
}