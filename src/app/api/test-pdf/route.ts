import { NextRequest, NextResponse } from "next/server";
import PDFDocument from 'pdfkit';

export async function GET() {
  try {
    console.log("Testing PDF generation...");
    
    // Create PDF using PDFKit with no default font to avoid Helvetica
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    
    // Explicitly set font to built-in font
    doc.font('Times-Roman');

    // Collect PDF data
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Add simple content
    doc.fontSize(16).text('PDF Test', 100, 100);
    doc.fontSize(12).text('This is a test PDF to verify PDF generation works.', 100, 150);
    
    doc.end();
    const pdfBuffer = await pdfPromise;

    console.log("PDF test successful, buffer size:", pdfBuffer.length);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="test.pdf"',
      },
    });

  } catch (error: any) {
    console.error("PDF test error:", error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}