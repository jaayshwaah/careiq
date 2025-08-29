// Alternative Bootstrap Admin API - Uses SQL function to avoid RLS issues
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Only allow specific emails to bootstrap admin access
    const allowedEmails = [
      'jking@pioneervalleyhealth.com',
      // Add other authorized emails here
    ];

    if (!allowedEmails.includes(user.email || '') && !user.email?.endsWith('@careiq.com')) {
      return NextResponse.json({ 
        ok: false, 
        error: "Not authorized to bootstrap admin access" 
      }, { status: 403 });
    }

    // Use the SQL function to create/update profile (bypasses RLS)
    const { data: profile, error: functionError } = await supa
      .rpc('create_user_profile', {
        p_user_id: user.id,
        p_email: user.email,
        p_full_name: user.email?.split('@')[0] || 'Admin User',
        p_role: 'administrator',
        p_is_admin: true
      });

    if (functionError) {
      // Fallback: try direct insert with minimal fields
      console.warn("Function call failed, trying direct insert:", functionError);
      
      const { error: directError } = await supa
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.email,
          role: 'administrator',
          is_admin: true
        }, {
          onConflict: 'user_id'
        });

      if (directError) {
        return NextResponse.json({ 
          ok: false, 
          error: `Failed to create profile: ${directError.message}` 
        }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: "Admin profile created successfully (direct method)",
        profile: { user_id: user.id, email: user.email, role: 'administrator', is_admin: true }
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Admin profile created/updated successfully",
      profile
    });

  } catch (error: any) {
    console.error("Bootstrap admin v2 error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to bootstrap admin access" 
    }, { status: 500 });
  }
}