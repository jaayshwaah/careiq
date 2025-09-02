import { NextRequest, NextResponse } from "next/server";
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET() {
  try {
    console.log("=== TEST PDF GENERATION STARTED ===");
    console.log("Environment:", process.env.NODE_ENV);
    console.log("Platform:", process.platform);
    console.log("Testing HTML-based PDF generation...");
    
    // Create HTML content for browser PDF printing
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>PDF Test</title>
    <style>
        @page { 
            size: A4; 
            margin: 1in; 
        }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4; 
            margin: 0; 
            padding: 0;
            color: #333;
        }
        .header { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 20px; 
            color: #1E40AF;
            text-align: center;
        }
        .content {
            margin-top: 20px;
            padding: 20px;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            background: #F8FAFC;
        }
        .test-info {
            font-size: 14px;
            color: #6B7280;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
        }
    </style>
</head>
<body>
    <div class="header">PDF Test Document</div>
    
    <div class="content">
        <p>This is a test PDF to verify PDF generation works using HTML-to-PDF conversion.</p>
        
        <p>This approach eliminates font loading issues in serverless environments by relying on standard web fonts available in all browsers.</p>
        
        <ul>
            <li>✅ No external font dependencies</li>
            <li>✅ Works in serverless environments</li>
            <li>✅ Maintains professional appearance</li>
            <li>✅ Easy to style and customize</li>
        </ul>
    </div>
    
    <div class="test-info">
        <strong>Test Details:</strong><br>
        Generated: ${new Date().toLocaleString()}<br>
        Method: HTML-to-PDF conversion<br>
        Status: Success
    </div>
</body>
</html>`;

    console.log("HTML test content generated, attempting PDF generation...");
    console.log("Chromium args:", chromium.args);
    console.log("Chromium executable path:", await chromium.executablePath().catch(e => `ERROR: ${e.message}`));

    try {
      console.log("Launching Puppeteer browser...");
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
            top: '1in',
            right: '1in',
            bottom: '1in',
            left: '1in'
          },
          printBackground: true
        });

        await browser.close();

        console.log("PDF test successful, buffer size:", pdfBuffer.length);

        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="test.pdf"',
          },
        });

      } catch (pdfError) {
        await browser.close();
        throw pdfError;
      }

    } catch (puppeteerError) {
      console.error('=== PUPPETEER FAILURE ===');
      console.error('Error message:', puppeteerError.message);
      console.error('Error code:', puppeteerError.code);
      console.error('Error errno:', puppeteerError.errno);
      console.error('Error syscall:', puppeteerError.syscall);
      console.error('Full error:', puppeteerError);
      console.warn('Puppeteer failed, falling back to HTML:', puppeteerError.message);
      
      // Fallback to HTML for development or when Puppeteer fails
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': 'inline; filename="test.html"',
        },
      });
    }

  } catch (error: any) {
    console.error("=== OUTER CATCH ERROR ===");
    console.error("PDF test error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error code:", error.code);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}