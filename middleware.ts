// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_PATHS = ['/today', '/history', '/summaries', '/settings', '/year-story'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set(name, value, options);
        },
        remove(name, options) {
          res.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    },
  );

  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (error) {
    console.error('[middleware] failed to load session', error);
  }

  if (process.env.NODE_ENV !== 'production') {
    const cookieNames = req.cookies.getAll().map((cookie) => cookie.name);
    console.log('[middleware] request cookies', cookieNames);
    const responseCookieNames = res.cookies.getAll().map((cookie) => cookie.name);
    console.log('[middleware] response cookies', responseCookieNames);
  }

  const { pathname, search } = req.nextUrl;

  if (isProtectedPath(pathname) && !session) {
    const redirectUrl = req.nextUrl.clone();
    const target = `${pathname}${search}`;
    redirectUrl.pathname = '/signin';
    redirectUrl.searchParams.set('redirectTo', target);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/today/:path*', '/history/:path*', '/summaries/:path*', '/settings/:path*', '/year-story/:path*'],
};
