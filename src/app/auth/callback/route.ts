import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/today';

  if (!code) {
    console.error('[auth/callback] Missing code param');
    return NextResponse.redirect(new URL('/auth?error=missing_code', url.origin));
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
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
              // Can happen in edge cases, ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[auth/callback] Exchange error:', error.message);
      return NextResponse.redirect(new URL('/auth?error=exchange_failed', url.origin));
    }

    // Successful login - redirect to next page
    const safeNext = next.startsWith('/') ? next : '/today';
    return NextResponse.redirect(new URL(safeNext, url.origin));

  } catch (err) {
    console.error('[auth/callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/auth?error=server_error', url.origin));
  }
}
