// middleware.ts
import { NextResponse } from 'next/server';

// No-op middleware to prevent Edge runtime errors.
// Remove or replace with real auth/redirect logic later.
export function middleware() {
  return NextResponse.next();
}

// Run on all paths except Next.js assets and favicon
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
