// src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";

// Avoid static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|fonts/).*)",
  ],
};

const PROTECTED_API_PREFIXES = [
  "/api/chats",
  "/api/messages", 
  "/api/ingest",
  "/api/admin",
  // Note: /api/chat is now public for testing
];

const PUBLIC_API_PREFIXES = [
  "/api/chat",
  "/api/health",
  "/api/debug",
  "/api/test",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Check if it's a public endpoint
    const isPublic = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (isPublic) {
      return NextResponse.next();
    }

    // Check if it needs authentication
    const needsAuth = PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (needsAuth) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    // This will be handled by the admin layout component
    return NextResponse.next();
  }

  return NextResponse.next();
}