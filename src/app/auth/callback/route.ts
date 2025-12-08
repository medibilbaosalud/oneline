import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieStore = await cookies();

  // Use type assertion for compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore as any
  });

  const code = url.searchParams.get('code');
  if (!code) {
    console.error('[auth/callback] Missing code param');
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin));
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Exchange error:', error.message);
      return NextResponse.redirect(new URL('/login?error=exchange_failed', url.origin));
    }

    // Redirect to today page after successful login
    const next = url.searchParams.get('next');
    const safeNext = next && next.startsWith('/') ? next : '/today';
    return NextResponse.redirect(new URL(safeNext, url.origin));

  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', url.origin));
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore as any
  });

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
