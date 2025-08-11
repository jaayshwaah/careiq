export const runtime = "edge";
import { NextResponse } from "next/server";

function sanitizeEnv(val: string | undefined) {
  return val?.trim().replace(/^['"]|['"]$/g, "");
}
function getOrigin(siteUrl: string | undefined, fallback = "https://careiq.vercel.app") {
  const raw = sanitizeEnv(siteUrl) || fallback;
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    openrouter_key_present: Boolean(sanitizeEnv(process.env.OPENROUTER_API_KEY)),
    model: sanitizeEnv(process.env.OPENROUTER_MODEL) || "(not set)",
    site_url: getOrigin(process.env.SITE_URL),
  });
}
