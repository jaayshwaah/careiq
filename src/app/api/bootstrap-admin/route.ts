// Bootstrap Admin API - Creates admin profile for initial setup
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";

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

    // Use service role client to bypass RLS policies
    const supaAdmin = supabaseService();

    // Check if profile already exists
    const { data: existingProfile } = await supaAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile to admin
      const { data: updatedProfile, error: updateError } = await supaAdmin
        .from('profiles')
        .update({
          role: 'Administrator',
          is_admin: true,
          full_name: user.email?.split('@')[0] || 'Admin User',
          facility_name: 'CareIQ Admin',
          facility_state: 'System',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ 
          ok: false, 
          error: `Failed to update profile: ${updateError.message}` 
        }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: "Admin profile updated successfully",
        profile: updatedProfile
      });
    } else {
      // Create new admin profile
      const { data: newProfile, error: createError } = await supaAdmin
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          role: 'Administrator',
          is_admin: true,
          full_name: user.email?.split('@')[0] || 'Admin User',
          facility_name: 'CareIQ Admin',
          facility_state: 'System',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ 
          ok: false, 
          error: `Failed to create profile: ${createError.message}` 
        }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: "Admin profile created successfully",
        profile: newProfile
      });
    }

  } catch (error: any) {
    console.error("Bootstrap admin error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to bootstrap admin access" 
    }, { status: 500 });
  }
}