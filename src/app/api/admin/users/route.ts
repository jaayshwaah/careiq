// src/app/api/admin/users/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    // Try to get users via admin function first
    let { data, error } = await supa.rpc('admin_list_users');
    
    if (error) {
      // Fallback to direct profiles query if RPC doesn't exist
      const { data: profiles, error: profilesError } = await supa
        .from('profiles')
        .select(`
          user_id,
          email,
          full_name,
          role,
          facility_name,
          facility_state,
          facility_id,
          is_admin,
          created_at,
          updated_at,
          approved_at
        `)
        .order('created_at', { ascending: false });
      
      if (profilesError) {
        return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 });
      }
      
      data = profiles;
    }

    return NextResponse.json({ ok: true, users: data || [] });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...userData } = body;

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    if (action === 'create_profile' || !action) {
      // Create/update profile via admin function
      const { data, error } = await supa.rpc('admin_create_profile', {
        target_user_id: userData.target_user_id || userData.user_id,
        user_role: userData.role,
        user_facility_id: userData.facility_id || '',
        user_facility_name: userData.facility_name || '',
        user_facility_state: userData.facility_state || '',
        user_full_name: userData.full_name,
        user_email: userData.email,
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, profile_id: data, message: "Profile created successfully" });
    }

    if (action === 'update_permissions') {
      // Legacy action - update only permissions
      const { data, error } = await supa.rpc('update_user_permissions', {
        target_user_id: userData.user_id,
        new_role: userData.role,
        set_admin: userData.is_admin
      });

      if (error) {
        // Fallback to direct update
        const { error: updateError } = await supa
          .from('profiles')
          .update({
            role: userData.role,
            is_admin: userData.is_admin,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.user_id);
        
        if (updateError) {
          return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
        }
      }

      return NextResponse.json({ ok: true, message: "Permissions updated successfully" });
    }

    if (action === 'update_user') {
      // New comprehensive user update
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Add fields that are provided
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.is_admin !== undefined) updateData.is_admin = userData.is_admin;
      if (userData.full_name !== undefined) updateData.full_name = userData.full_name;
      if (userData.facility_name !== undefined) updateData.facility_name = userData.facility_name;
      if (userData.facility_state !== undefined) updateData.facility_state = userData.facility_state;
      if (userData.facility_id !== undefined) updateData.facility_id = userData.facility_id;

      const { error: updateError } = await supa
        .from('profiles')
        .update(updateData)
        .eq('user_id', userData.user_id);
      
      if (updateError) {
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, message: "User updated successfully" });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ ok: false, error: "User ID required" }, { status: 400 });
    }

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    const supa = supabaseServerWithAuth(token);

    // Delete profile (this will cascade delete related data)
    const { error } = await supa
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}