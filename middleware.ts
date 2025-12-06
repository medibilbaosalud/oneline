import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // if (session && req.nextUrl.pathname === '/') {
  //   const redirectUrl = req.nextUrl.clone();
  //   redirectUrl.pathname = '/today';
  //   return NextResponse.redirect(redirectUrl);
  // }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon-192\\.svg).*)',
  ],
};
