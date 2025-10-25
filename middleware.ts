// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const nextResponse = NextResponse.next();

  // Maintain Supabase session cookies for downstream requests but do not block
  // navigation when no session is present. We’ll reintroduce hard guards later.
  try {
    const supabase = createMiddlewareClient({ req, res: nextResponse });
    await supabase.auth.getSession();
  } catch (error) {
    console.error('[middleware] session refresh failed', error);
  }

  return nextResponse;
}

export const config = {
  matcher: ['/today/:path*', '/history/:path*', '/summaries/:path*', '/settings/:path*', '/year-story/:path*'],
};
