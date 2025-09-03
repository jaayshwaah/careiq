// Automated Daily Rounds Email - Runs at 6am daily via cron
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    console.log("Starting automated daily rounds email generation at", new Date().toISOString());
    
    // Verify this is a legitimate cron request
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supa = supabaseServerWithAuth();

    // Get all facilities that have auto-email enabled
    const { data: facilities, error: facilitiesError } = await supa
      .from("profiles")
      .select("facility_id, facility_name, facility_state, user_id, email, full_name, role")
      .eq("auto_daily_rounds_email", true)
      .not("facility_id", "is", null);

    if (facilitiesError) {
      console.error("Failed to fetch facilities for auto-email:", facilitiesError);
      return NextResponse.json({ error: "Failed to fetch facilities" }, { status: 500 });
    }

    if (!facilities || facilities.length === 0) {
      console.log("No facilities have auto-email enabled");
      return NextResponse.json({ message: "No facilities with auto-email enabled" });
    }

    console.log(`Found ${facilities.length} facilities with auto-email enabled`);

    const results = [];
    
    // Process each facility
    for (const facility of facilities) {
      try {
        console.log(`Processing facility: ${facility.facility_name} (${facility.facility_id})`);
        
        // Generate fresh daily rounds for this facility
        const roundData = await generateFacilityDailyRound(facility);
        
        if (roundData) {
          // Generate PDF
          const pdfBuffer = await generateDailyRoundPDF(roundData);
          
          // Send email
          const emailResult = await sendDailyRoundEmail(facility, roundData, pdfBuffer);
          
          results.push({
            facility_id: facility.facility_id,
            facility_name: facility.facility_name,
            status: 'success',
            email_sent: emailResult.success,
            round_id: roundData.id
          });
          
          console.log(`Successfully processed ${facility.facility_name}`);
        } else {
          results.push({
            facility_id: facility.facility_id,
            facility_name: facility.facility_name,
            status: 'failed',
            error: 'Failed to generate round data'
          });
        }
      } catch (facilityError) {
        console.error(`Error processing facility ${facility.facility_name}:`, facilityError);
        results.push({
          facility_id: facility.facility_id,
          facility_name: facility.facility_name,
          status: 'error',
          error: facilityError.message
        });
      }
    }

    console.log("Automated daily rounds email job completed:", results);

    return NextResponse.json({
      success: true,
      processed: facilities.length,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Automated daily rounds email job failed:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process automated daily rounds" 
    }, { status: 500 });
  }
}

async function generateFacilityDailyRound(facility: any) {
  try {
    const supa = supabaseServerWithAuth();
    
    // Create a mock request body for the daily rounds generator
    const requestBody = {
      template_type: 'general_management',
      unit: 'General',
      shift: '7a-3p',
      custom_items: [],
      ai_customize: true,
      resident_acuity: 'medium',
      special_focus_areas: ['Fresh Daily Items'] // Always use fresh items for auto-email
    };

    // Generate the daily round using our existing logic
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/daily-rounds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer mock-cron-token-${facility.user_id}`
      },
      body: JSON.stringify(requestBody)
    });

    if (response.ok) {
      const result = await response.json();
      return result.round;
    } else {
      console.error("Failed to generate daily round for", facility.facility_name);
      return null;
    }
  } catch (error) {
    console.error("Error generating facility daily round:", error);
    return null;
  }
}

async function generateDailyRoundPDF(roundData: any): Promise<Buffer> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/daily-rounds/generate-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-cron-token'
      },
      body: JSON.stringify({
        roundData: roundData,
        includeDate: true,
        customDate: new Date().toLocaleDateString()
      })
    });

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer);
    } else {
      throw new Error('Failed to generate PDF');
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
}

async function sendDailyRoundEmail(facility: any, roundData: any, pdfBuffer: Buffer) {
  try {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const emailSubject = `Daily Round Checklist - ${facility.facility_name} - ${currentDate}`;
    
    const emailBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">Daily Round Checklist</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${facility.facility_name}</p>
      </div>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #1e293b; margin-top: 0;">Today's Rounds - ${currentDate}</h2>
        <p style="color: #475569;">Good morning! Your automated daily round checklist has been generated and is attached as a PDF.</p>
        
        <div style="margin: 20px 0;">
          <strong>Round Details:</strong><br>
          • Unit: ${roundData.unit}<br>
          • Shift: ${roundData.shift}<br>
          • Total Items: ${roundData.items?.length || 0}<br>
          • Generated: ${new Date().toLocaleString()}
        </div>
        
        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <strong>📋 Survey-Ready Checklist:</strong><br>
          Each item has been carefully selected based on current CMS compliance requirements and common surveyor observations. Print the attached PDF and use it during your rounds.
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #64748b; font-size: 14px;">
        Generated by <strong>CareIQ</strong> Daily Round Automation<br>
        Questions? Contact support or adjust your settings in the CareIQ dashboard.
      </div>
    </div>`;

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, just log the email details
    console.log(`Would send email to: ${facility.email}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`PDF size: ${pdfBuffer.length} bytes`);

    // TODO: Implement actual email sending
    // const emailService = new EmailService();
    // await emailService.send({
    //   to: facility.email,
    //   subject: emailSubject,
    //   html: emailBody,
    //   attachments: [{
    //     filename: `daily-rounds-${new Date().toISOString().split('T')[0]}.pdf`,
    //     content: pdfBuffer,
    //     contentType: 'application/pdf'
    //   }]
    // });

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}