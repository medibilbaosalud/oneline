// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => req.cookies.get(key)?.value,
        set: (key, value, options) => {
          res.cookies.set(key, value, options);
        },
        remove: (key, options) => {
          res.cookies.set(key, '', { ...options, maxAge: 0 });
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const protectedRoutes = ['/today', '/history', '/summaries', '/settings', '/year-story'];
  const requiresAuth = protectedRoutes.some((prefix) => req.nextUrl.pathname.startsWith(prefix));

  if (requiresAuth && !session) {
    const url = req.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('redirectTo', `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ['/today/:path*', '/history/:path*', '/summaries/:path*', '/settings/:path*', '/year-story/:path*'],
};
