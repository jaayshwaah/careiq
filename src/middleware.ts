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
  "/api/chat",
  "/api/messages",
  "/api/ingest",
  // add more paths if needed
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const needsAuth = PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
    if (needsAuth) {
      const auth = req.headers.get("authorization") || "";
      if (!auth.startsWith("Bearer ")) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}
