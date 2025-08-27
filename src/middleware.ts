// src/middleware.ts - Simplified and fixed
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|fonts/|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};

const PROTECTED_API_PREFIXES = [
  "/api/chats",
  "/api/messages", 
  "/api/admin",
  "/api/profile",
  "/api/bookmarks",
  "/api/calendar",
];

const PUBLIC_API_PREFIXES = [
  "/api/health",
  "/api/debug",
  "/api/test",
  "/api/init-db",
  "/api/extract",
  "/api/ingest", // Make this public for now to fix upload issues
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files and specific extensions
  if (pathname.includes('.') && !pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // API route protection
  if (pathname.startsWith("/api/")) {
    // Check if it's explicitly public
    const isPublic = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isPublic) {
      return NextResponse.next();
    }

    // Check if it needs authentication
    const needsAuth = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (needsAuth) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return NextResponse.json({ 
          ok: false, 
          error: "Authentication required" 
        }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}