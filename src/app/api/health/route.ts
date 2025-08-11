export const runtime = "edge";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    openrouter_key_present: Boolean(process.env.OPENROUTER_API_KEY),
    model: process.env.OPENROUTER_MODEL || "(not set)",
    site_url: process.env.SITE_URL || "(not set)",
  });
}
