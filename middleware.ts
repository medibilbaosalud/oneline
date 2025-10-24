// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

const PROTECTED_PREFIXES = ['/today', '/history', '/summaries', '/settings', '/year-story'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

export async function middleware(req: NextRequest) {
  const nextResponse = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res: nextResponse });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  if (!session && isProtectedPath(pathname)) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/auth';
    redirectUrl.search = '';
    const search = req.nextUrl.search ?? '';
    redirectUrl.searchParams.set('redirectTo', `${pathname}${search}`);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    applyCookies(nextResponse, redirectResponse);
    return redirectResponse;
  }

  return nextResponse;
}

export const config = {
  matcher: ['/today/:path*', '/history/:path*', '/summaries/:path*', '/settings/:path*', '/year-story/:path*'],
};
