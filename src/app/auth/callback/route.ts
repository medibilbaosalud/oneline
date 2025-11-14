import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies });

  const code = url.searchParams.get('code');
  if (!code) {
    console.error('exchangeCodeForSession ERROR: missing code param');
    return NextResponse.redirect(new URL('/auth?error=oauth', url.origin));
  }

  const codeVerifier = cookieStore.get?.('sb-code-verifier')?.value;
  if (!codeVerifier) {
    console.warn('exchangeCodeForSession WARN: missing sb-code-verifier cookie');
  }

  const { error } = await supabase.auth.exchangeCodeForSession({
    authCode: code,
    codeVerifier: codeVerifier ?? undefined,
  });
  if (error) {
    console.error('exchangeCodeForSession ERROR:', error);
    return NextResponse.redirect(new URL('/auth?error=oauth', url.origin));
  }

  const next = url.searchParams.get('next');
  const safeNext = next && next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
