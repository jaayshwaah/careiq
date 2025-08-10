import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name, value, options) { res.cookies.set({ name, value, ...options }); },
        remove(name, options) { res.cookies.set({ name, value: '', ...options }); }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register');

  if (!user && !isAuthPage) {
    const url = req.nextUrl.clone(); url.pathname = '/login'; return NextResponse.redirect(url);
  }
  if (user && isAuthPage) {
    const url = req.nextUrl.clone(); url.pathname = '/'; return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/', '/((?!_next/static|_next/image|favicon.ico).*)'],
};
