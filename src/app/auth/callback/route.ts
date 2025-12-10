import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createSupabaseClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore - may be called from Server Component
          }
        },
      },
    }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  if (!code) {
    console.error('[auth/callback] Missing code param');
    return NextResponse.redirect(new URL('/auth?error=missing_code', url.origin));
  }

  const cookieStore = await cookies();
  const supabase = createSupabaseClient(cookieStore);

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Exchange error:', error.message);
      return NextResponse.redirect(new URL('/auth?error=exchange_failed', url.origin));
    }

    // Redirect to today page after successful login
    const next = url.searchParams.get('next');
    const safeNext = next && next.startsWith('/') ? next : '/today';
    return NextResponse.redirect(new URL(safeNext, url.origin));

  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/auth?error=server_error', url.origin));
  }
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createSupabaseClient(cookieStore);

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
