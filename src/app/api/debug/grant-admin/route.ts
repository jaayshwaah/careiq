// src/app/api/debug/grant-admin/route.ts
// Temporary endpoint to grant admin access - DELETE after use
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Missing Supabase env variables");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (email !== 'jking@pioneervalleyhealth.com') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // Update the user's role to careiq_admin
    const { data, error } = await supabase
      .from("profiles")
      .update({ 
        role: 'careiq_admin',
        is_admin: true 
      })
      .eq("email", email)
      .select();

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Admin access granted",
      data: data 
    });

  } catch (error: any) {
    console.error("Admin grant error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to grant admin access" 
    }, { status: 500 });
  }
}