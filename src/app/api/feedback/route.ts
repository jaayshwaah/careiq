// src/app/api/feedback/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { type, message } = await req.json();
    
    if (!type || !message?.trim()) {
      return NextResponse.json({ ok: false, error: "Type and message are required" }, { status: 400 });
    }

    // Get user authentication
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile for context
    const { data: profile } = await supa
      .from("profiles")
      .select("full_name, role, facility_name, facility_state")
      .eq("user_id", user.id)
      .single();

    // Prepare email content
    const subject = type === 'feature' ? 'CareIQ Feature Request' : 'CareIQ Bug Report';
    const emailBody = `
New ${type === 'feature' ? 'Feature Request' : 'Bug Report'} from CareIQ

From: ${profile?.full_name || 'Unknown'} (${user.email})
Role: ${profile?.role || 'Not specified'}
Facility: ${profile?.facility_name || 'Not specified'}
State: ${profile?.facility_state || 'Not specified'}

Message:
${message}

---
Submitted: ${new Date().toISOString()}
User ID: ${user.id}
    `;

    // Email service integration
    const FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY && FEEDBACK_EMAIL) {
      try {
        // Using Resend (recommended)
        const { Resend } = await import('resend');
        const resend = new Resend(RESEND_API_KEY);
        
        await resend.emails.send({
          from: 'CareIQ <noreply@careiq.com>',
          to: FEEDBACK_EMAIL,
          subject: subject,
          text: emailBody,
          html: emailBody.replace(/\n/g, '<br>'),
        });
        
        console.log('✅ Feedback email sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send feedback email:', emailError);
        // Continue - don't fail the request if email fails
      }
    } else {
      // Fallback: Log to console for development
      console.log('=== FEEDBACK SUBMISSION (EMAIL NOT CONFIGURED) ===');
      console.log('Subject:', subject);
      console.log('Body:', emailBody);
      console.log('To configure email:');
      console.log('1. Sign up for Resend at https://resend.com');
      console.log('2. Add RESEND_API_KEY to your .env.local');
      console.log('3. Add FEEDBACK_EMAIL=your-email@domain.com to .env.local');
      console.log('======================================================');
    }

    // Save to database as backup (optional)
    try {
      await supa.from("feedback").insert({
        user_id: user.id,
        type,
        message: message.trim(),
        user_email: user.email,
        created_at: new Date().toISOString()
      });
    } catch (dbError) {
      // Continue even if database save fails
      console.warn("Could not save feedback to database:", dbError);
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Thank you for your feedback! We will review it soon." 
    });

  } catch (error: any) {
    console.error("Feedback submission error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: "Failed to submit feedback" 
    }, { status: 500 });
  }
}