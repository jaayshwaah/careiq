import { NextRequest, NextResponse } from "next/server";
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET() {
  const logs: string[] = [];
  
  function addLog(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    if (data) {
      logs.push(`${logEntry}: ${JSON.stringify(data, null, 2)}`);
    } else {
      logs.push(logEntry);
    }
    console.log(logEntry, data || '');
  }

  try {
    addLog("=== TEST PDF GENERATION STARTED ===");
    addLog("Environment", process.env.NODE_ENV);
    addLog("Platform", process.platform);
    addLog("Node version", process.version);
    addLog("Testing HTML-based PDF generation...");
    
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

    addLog("HTML test content generated, attempting PDF generation...");
    
    try {
      const execPath = await chromium.executablePath();
      addLog("Chromium executable path", execPath);
    } catch (execError) {
      addLog("Chromium executable path ERROR", execError.message);
    }
    
    addLog("Chromium args", chromium.args);
    addLog("Chromium defaultViewport", chromium.defaultViewport);
    addLog("Chromium headless", chromium.headless);

    try {
      addLog("Launching Puppeteer browser...");
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

      addLog("Browser launched successfully");

      try {
        addLog("Creating new page...");
        const page = await browser.newPage();
        addLog("Setting page content...");
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        addLog("Generating PDF...");
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

        addLog("PDF test successful, buffer size", pdfBuffer.length);

        addLog("=== SUCCESS: Returning PDF ===");
        
        // Return logs page instead of PDF for debugging
        return new NextResponse(createLogsPage(logs, "SUCCESS: PDF generated successfully"), {
          headers: {
            'Content-Type': 'text/html',
          },
        });

      } catch (pdfError) {
        await browser.close();
        addLog("PDF generation error", {
          message: pdfError.message,
          code: pdfError.code,
          name: pdfError.name
        });
        throw pdfError;
      }

    } catch (puppeteerError) {
      addLog("=== PUPPETEER FAILURE ===");
      addLog("Error message", puppeteerError.message);
      addLog("Error code", puppeteerError.code);
      addLog("Error errno", puppeteerError.errno);
      addLog("Error syscall", puppeteerError.syscall);
      addLog("Error name", puppeteerError.name);
      addLog("Error stack", puppeteerError.stack);
      
      // Return logs page with error details
      return new NextResponse(createLogsPage(logs, `PUPPETEER FAILURE: ${puppeteerError.message}`), {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

  } catch (error: any) {
    addLog("=== OUTER CATCH ERROR ===");
    addLog("PDF test error", error.message);
    addLog("Error stack", error.stack);
    addLog("Error name", error.name);
    addLog("Error code", error.code);
    
    return new NextResponse(createLogsPage(logs, `OUTER ERROR: ${error.message}`), {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}

function createLogsPage(logs: string[], status: string) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>PDF Test Logs</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
        .status { padding: 10px; margin-bottom: 20px; border-radius: 5px; font-weight: bold; }
        .success { background: #155724; color: #d1ecf1; border: 1px solid #c3e6cb; }
        .error { background: #721c24; color: #f8d7da; border: 1px solid #f5c6cb; }
        .logs { background: #2d2d2d; padding: 15px; border-radius: 5px; white-space: pre-wrap; }
        button { margin: 10px 5px; padding: 8px 15px; }
    </style>
</head>
<body>
    <h1>PDF Generation Test Logs</h1>
    <div class="status ${status.includes('SUCCESS') ? 'success' : 'error'}">
        Status: ${status}
    </div>
    
    <button onclick="copyLogs()">Copy All Logs</button>
    <button onclick="location.reload()">Refresh Test</button>
    
    <div class="logs" id="logs">${logs.join('\n')}</div>
    
    <script>
        function copyLogs() {
            const logs = document.getElementById('logs').textContent;
            navigator.clipboard.writeText(logs).then(() => {
                alert('Logs copied to clipboard!');
            });
        }
    </script>
</body>
</html>`;
}