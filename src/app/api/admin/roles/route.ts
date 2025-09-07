import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supa = supabaseService();

    const { data: roles, error } = await supa
      .from('staff_roles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching roles:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, roles: roles || [] });
  } catch (error: any) {
    console.error('Admin roles API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
