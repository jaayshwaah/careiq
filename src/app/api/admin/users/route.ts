// src/app/api/admin/users/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseServerWithAuth, supabaseService } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    // Use service role client to bypass RLS entirely for admin operations
    const supa = supabaseService();
    
    // Direct query using service role (bypasses RLS automatically)
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
      console.error('Admin users query error:', profilesError);
      return NextResponse.json({ ok: false, error: profilesError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, users: profiles || [] });
  } catch (error: any) {
    console.error('Admin users API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...userData } = body;

    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    
    // Use service role for admin operations to bypass RLS
    const supa = supabaseService();

    if (action === 'create_profile' || !action) {
      // Create/update profile directly using service role (bypasses RLS)
      const { data, error } = await supa
        .from('profiles')
        .upsert({
          user_id: userData.target_user_id || userData.user_id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          facility_id: userData.facility_id || '',
          facility_name: userData.facility_name || '',
          facility_state: userData.facility_state || '',
          is_admin: userData.is_admin || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Create profile error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, profile: data, message: "Profile created successfully" });
    }

    if (action === 'update_permissions') {
      // Update permissions directly using service role (bypasses RLS)
      const { error: updateError } = await supa
        .from('profiles')
        .update({
          role: userData.role,
          is_admin: userData.is_admin,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userData.user_id);
      
      if (updateError) {
        console.error('Update permissions error:', updateError);
        return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
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
    
    // Use service role for admin operations to bypass RLS
    const supa = supabaseService();

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