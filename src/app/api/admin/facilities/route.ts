import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supa = supabaseService();

    const { data: facilities, error } = await supa
      .from('facilities')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching facilities:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, facilities: facilities || [] });
  } catch (error: any) {
    console.error('Admin facilities API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      address,
      city,
      state,
      zip_code,
      phone,
      email,
      license_number,
      cms_certification_number,
      bed_count,
      facility_type
    } = body;

    const supa = supabaseService();

    const { data, error } = await supa
      .from('facilities')
      .insert({
        name,
        address,
        city,
        state,
        zip_code,
        phone,
        email,
        license_number,
        cms_certification_number,
        bed_count: bed_count || 0,
        facility_type: facility_type || 'skilled_nursing'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating facility:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, facility: data });
  } catch (error: any) {
    console.error('Admin facilities POST API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
