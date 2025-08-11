import { NextResponse } from "next/server";

// Mock account endpoint; swap with real auth later (e.g., Supabase Auth).
export async function GET() {
  return NextResponse.json({ id: "guest", name: "CareIQ Guest", email: "guest@careiq.local" });
}
