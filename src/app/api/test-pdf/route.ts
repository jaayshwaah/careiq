import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
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

    console.log("HTML test content generated successfully");

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline; filename="pdf-test.html"',
      },
    });

  } catch (error: any) {
    console.error("PDF test error:", error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}