// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  // Run on everything except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

const PROTECTED_API_PREFIXES = [
  "/api/chats",
  "/api/chat",
  "/api/messages",
  "/api/ingest",
];

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Security headers on all responses
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Permissions-Policy", "geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Only enforce Authorization on selected API routes (let /api/auth or public endpoints pass)
  if (url.pathname.startsWith("/api/")) {
    const protectedMatch = PROTECTED_API_PREFIXES.some((p) => url.pathname.startsWith(p));
    if (protectedMatch) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  return res;
}
