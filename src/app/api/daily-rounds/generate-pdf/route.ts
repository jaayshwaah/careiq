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

    // Create PDF using PDFKit with explicit font to avoid Helvetica loading
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      font: 'Times-Roman' // Use built-in font instead of Helvetica
    });

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Generate PDF content based on AI layout
    const pageHeight = doc.page.height - 100; // Account for margins
    let currentY = 80;

    // Header section
    const headerSection = pdfLayout.sections.find((s: any) => s.type === 'header');
    if (headerSection) {
      doc.fontSize(16).text('DAILY ROUND CHECKLIST', 50, currentY, { align: 'center' });
      currentY += 25;
      
      doc.fontSize(14).text(roundData.title, 50, currentY, { align: 'center' });
      currentY += 20;
      
      const dateText = includeDate 
        ? `Date: ${customDate || new Date().toLocaleDateString()}` 
        : `Generated: ${new Date().toLocaleDateString()}`;
      
      doc.fontSize(10)
        .text(dateText, 50, currentY)
        .text(`Unit: ${roundData.unit}`, 200, currentY)
        .text(`Shift: ${roundData.shift}`, 350, currentY);
      currentY += 15;
      
      doc.text(`Facility: ${roundData.metadata.facility_name}`, 50, currentY);
      currentY += 25;
    }

    // Items section - organize by category for better layout
    const itemsByCategory = roundData.items.reduce((acc: any, item: RoundItem) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

    let itemIndex = 1;
    Object.entries(itemsByCategory).forEach(([category, items]: [string, any]) => {
      if (currentY > pageHeight - 100) {
        // Not enough space, need to compress more
        doc.fontSize(8);
      }
      
      // Category header
      doc.fontSize(12).text(category, 50, currentY);
      currentY += 15;
      
      (items as RoundItem[]).forEach((item: RoundItem) => {
        if (currentY > pageHeight - 80) {
          doc.fontSize(7); // Make text smaller if running out of space
        }
        
        const fontSize = currentY > pageHeight - 80 ? 7 : 9;
        doc.fontSize(fontSize);
        
        // Checkbox and task
        doc.text('☐', 60, currentY)
          .text(`${itemIndex}. ${item.task}`, 75, currentY, { width: 400 });
        
        // Compliance info only
        if (item.compliance_related) {
          doc.fontSize(fontSize - 1).fillColor('red').text('⚠️ COMPLIANCE REQUIRED', 75, currentY + 12);
        }
        
        // Completion line
        doc.fillColor('black').text('Completed by: _________________ Time: _______', 75, currentY + 22);
        
        currentY += item.notes ? 45 : 35;
        itemIndex++;
      });
      
      currentY += 10;
    });

    // Footer section
    if (currentY < pageHeight - 60) {
      doc.fontSize(10).text('Staff Signature: _____________________ Date: __________', 50, currentY);
      currentY += 25;
      
      doc.text('Notes/Issues Identified:', 50, currentY);
      currentY += 15;
      
      for (let i = 0; i < 3; i++) {
        doc.text('_________________________________________________', 50, currentY);
        currentY += 15;
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