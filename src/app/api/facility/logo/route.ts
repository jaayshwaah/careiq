// src/app/api/facility/logo/route.ts - Facility logo upload and management
import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST - Upload facility logo
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check user's facility information and role
    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, facility_name, role")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Please set your facility information in settings before uploading a logo" 
      }, { status: 400 });
    }

    // Check if user has admin privileges for their facility
    const isAdmin = profile.role?.includes('administrator') || 
                   profile.role?.includes('admin') || 
                   profile.role === 'careiq_admin';

    if (!isAdmin) {
      return NextResponse.json({ 
        ok: false, 
        error: "Admin privileges required to upload facility logo" 
      }, { status: 403 });
    }

    const formData = await req.formData();
    const logoFile = formData.get("logo") as File;

    if (!logoFile) {
      return NextResponse.json({ ok: false, error: "No logo file provided" }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(logoFile.type)) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid file type. Please use JPEG, PNG, or WebP format." 
      }, { status: 400 });
    }

    if (logoFile.size > 2 * 1024 * 1024) { // 2MB limit
      return NextResponse.json({ 
        ok: false, 
        error: "File size too large. Maximum size is 2MB." 
      }, { status: 400 });
    }

    // Upload to Supabase storage
    const supabaseAdmin = supabaseService();
    const fileName = `facility-${profile.facility_id}-${Date.now()}.${logoFile.name.split('.').pop()}`;
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('facility-assets')
      .upload(`logos/${fileName}`, logoFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to upload logo file" 
      }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('facility-assets')
      .getPublicUrl(`logos/${fileName}`);

    // Update profiles table with facility logo URL for all users in this facility
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        facility_logo_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('facility_id', profile.facility_id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to update facility logo" 
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Facility logo uploaded successfully",
      logoUrl: publicUrl,
      facility: profile.facility_name
    });

  } catch (error: any) {
    console.error("Facility logo upload error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to upload facility logo" 
    }, { status: 500 });
  }
}

// GET - Get facility logo
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's facility logo
    const { data: profile, error } = await supa
      .from("profiles")
      .select("facility_id, facility_name, facility_logo_url")
      .eq("user_id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ 
        ok: false, 
        error: "Profile not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      facilityId: profile.facility_id,
      facilityName: profile.facility_name,
      logoUrl: profile.facility_logo_url
    });

  } catch (error: any) {
    console.error("Get facility logo error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to get facility logo" 
    }, { status: 500 });
  }
}

// DELETE - Remove facility logo
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supa
      .from("profiles")
      .select("facility_id, facility_name, role, facility_logo_url")
      .eq("user_id", user.id)
      .single();

    if (!profile?.facility_id) {
      return NextResponse.json({ 
        ok: false, 
        error: "Facility information not found" 
      }, { status: 400 });
    }

    // Check admin privileges
    const isAdmin = profile.role?.includes('administrator') || 
                   profile.role?.includes('admin') || 
                   profile.role === 'careiq_admin';

    if (!isAdmin) {
      return NextResponse.json({ 
        ok: false, 
        error: "Admin privileges required to remove facility logo" 
      }, { status: 403 });
    }

    const supabaseAdmin = supabaseService();

    // Remove logo file from storage if it exists
    if (profile.facility_logo_url) {
      const fileName = profile.facility_logo_url.split('/').pop();
      if (fileName) {
        await supabaseAdmin.storage
          .from('facility-assets')
          .remove([`logos/${fileName}`]);
      }
    }

    // Clear logo URL from all facility users
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        facility_logo_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('facility_id', profile.facility_id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to remove facility logo" 
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Facility logo removed successfully",
      facility: profile.facility_name
    });

  } catch (error: any) {
    console.error("Remove facility logo error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to remove facility logo" 
    }, { status: 500 });
  }
}