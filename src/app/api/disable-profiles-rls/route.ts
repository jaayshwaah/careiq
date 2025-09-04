// API endpoint to disable RLS on profiles table to eliminate infinite recursion
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "careiq-disable-rls" } },
  });
}

export async function POST() {
  try {
    console.log('Disabling RLS on profiles table to eliminate infinite recursion...');
    
    const supabase = getAdminClient();
    
    // First, let's check current policies
    const { data: currentPolicies, error: policiesError } = await supabase
      .rpc('exec', { 
        sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
              FROM pg_policies 
              WHERE tablename = 'profiles';`
      });
    
    console.log('Current policies:', currentPolicies || 'Error fetching policies:', policiesError);
    
    // Disable RLS on profiles table
    const { data: disableResult, error: disableError } = await supabase
      .rpc('exec', { 
        sql: 'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;'
      });
    
    if (disableError) {
      console.error('Disable RLS error:', disableError);
      return NextResponse.json({ 
        ok: false, 
        error: disableError.message,
        currentPolicies: currentPolicies 
      }, { status: 500 });
    }
    
    // Verify RLS is disabled
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('exec', { 
        sql: `SELECT tablename, rowsecurity 
              FROM pg_tables 
              WHERE tablename = 'profiles';`
      });
    
    console.log('RLS status after disable:', verifyResult);
    console.log('Disable result:', disableResult);
    
    return NextResponse.json({ 
      ok: true, 
      message: 'RLS disabled on profiles table',
      currentPolicies,
      verifyResult,
      disableResult
    });
    
  } catch (error: any) {
    console.error('Disable profiles RLS error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}