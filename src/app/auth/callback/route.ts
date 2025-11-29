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

  const codeVerifier = cookieStore.get('sb-code-verifier')?.value;
  if (!codeVerifier) {
    console.warn('exchangeCodeForSession WARN: missing sb-code-verifier cookie');
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('exchangeCodeForSession ERROR:', error);
    return NextResponse.redirect(new URL('/auth?error=oauth', url.origin));
  }

  const next = url.searchParams.get('next');
  const safeNext = next && next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(safeNext, url.origin));
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const payload = await req.json().catch(() => null);
  const event = payload?.event as string | undefined;
  const session = payload?.session as
    | { access_token?: string; refresh_token?: string }
    | null
    | undefined;

  if (event === 'SIGNED_OUT') {
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  }

  if (session?.access_token && session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }

  return NextResponse.json({ ok: true });
}
