import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  // If you're using server-side Supabase helpers, swap this for your existing pattern
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // service key so we can insert; or use RLS with user_id
  );

  // Get the user id from your auth cookie/session if you store it; stubbed here:
  const userIdCookie = (await cookies()).get("sb-user-id");
  const user_id = userIdCookie?.value ?? null;

  const { data, error } = await supabase
    .from("chats")
    .insert({
      title: "New chat",
      user_id, // nullable is fine if you allow anon, else enforce auth
    })
    .select("id, title, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

// (Optional) block GET so people can't hit it in the browser accidentally
export function GET() {
  return NextResponse.json({ error: "Use POST" }, { status: 405 });
}
