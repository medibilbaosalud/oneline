// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

const TABLE = 'user_vaults';
const PRIVATE_PREFIXES = ['/app', '/today', '/history', '/journal', '/summaries', '/settings', '/year-story'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname, search } = req.nextUrl;
  const isApiRoute = pathname.startsWith('/api/');
  if (isApiRoute) {
    return res;
  }

  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const needsAuth = PRIVATE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const pathWithSearch = `${pathname}${search ?? ''}`;

  if (!session) {
    if (needsAuth) {
      const signinUrl = new URL('/signin', req.url);
      signinUrl.searchParams.set('redirectTo', pathWithSearch);
      const response = NextResponse.redirect(signinUrl);
      res.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie);
      });
      return response;
    }
    return res;
  }

  if (!(needsAuth || isOnboardingRoute)) {
    return res;
  }

  const { data: vault } = await supabase
    .from(TABLE)
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  const hasVault = Boolean(vault);

  if (!hasVault && pathname === '/onboarding/done') {
    const onboardingUrl = new URL('/onboarding/vault', req.url);
    const redirectTarget = req.nextUrl.searchParams.get('redirectTo');
    if (redirectTarget) {
      onboardingUrl.searchParams.set('redirectTo', redirectTarget);
    }
    const response = NextResponse.redirect(onboardingUrl);
    res.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  }

  if (!hasVault && !isOnboardingRoute) {
    const onboardingUrl = new URL('/onboarding/vault', req.url);
    onboardingUrl.searchParams.set('redirectTo', pathWithSearch);
    const response = NextResponse.redirect(onboardingUrl);
    res.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  }

  if (hasVault && isOnboardingRoute && pathname !== '/onboarding/done') {
    const doneUrl = new URL('/onboarding/done', req.url);
    const redirectTarget = req.nextUrl.searchParams.get('redirectTo');
    if (redirectTarget) {
      doneUrl.searchParams.set('redirectTo', redirectTarget);
    }
    const response = NextResponse.redirect(doneUrl);
    res.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  }

  return res;
}

// Excluye assets estáticos
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
