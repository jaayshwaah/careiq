import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // Get admin auth
    const authHeader = req.headers.get("authorization") || undefined;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const supa = supabaseServerWithAuth(accessToken);

    // Verify admin user
    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin privileges
    const { data: profile } = await supa
      .from('profiles')
      .select('role, is_admin')
      .eq('user_id', user.id)
      .single();

    if (profile?.is_admin !== true) {
      return NextResponse.json({ ok: false, error: "Insufficient privileges" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      role = 'facility_admin',
      facility_id,
      phone 
    } = body;

    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json({ 
        ok: false, 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    // Create admin client with service role key
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        facility_id: facility_id || null
      }
    });

    if (authError) {
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to create user: ${authError.message}` 
      }, { status: 400 });
    }

    // Create user profile
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        email,
        first_name,
        last_name,
        role,
        facility_id: facility_id || null,
        phone: phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      // Clean up auth user if profile creation fails
      await adminSupabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to create user profile: ${profileError.message}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      ok: true, 
      user: {
        id: authUser.user.id,
        email,
        first_name,
        last_name,
        role,
        facility_id
      }
    });

  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || "Failed to create user" 
    }, { status: 500 });
  }
}