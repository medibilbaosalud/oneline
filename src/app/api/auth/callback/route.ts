import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Session } from '@supabase/supabase-js';
import { getSupabaseProjectRef, readSupabaseTokensFromCookies } from '@/lib/supabaseTokens';

export const dynamic = 'force-dynamic';

type CallbackPayload = {
  event?: string;
  session?: Session | null;
};

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const cookieStore = await cookies();
  const body = (await request.json().catch(() => null)) as CallbackPayload | null;

  if (!body?.event) {
    return NextResponse.json({ ok: false, error: 'missing_event' }, { status: 400 });
  }

  const event = body.event;

  switch (event) {
    case 'INITIAL_SESSION':
    case 'SIGNED_IN':
    case 'TOKEN_REFRESHED': {
      const session = body.session ?? null;
      const projectRef = getSupabaseProjectRef();
      const fallbackTokens = readSupabaseTokensFromCookies(cookieStore, { projectRef });
      const accessToken = session?.access_token ?? fallbackTokens.accessToken;
      const refreshToken = session?.refresh_token ?? fallbackTokens.refreshToken;

      if (!session && !accessToken && !refreshToken) {
        await supabase.auth.signOut();
        return NextResponse.json({ ok: true });
      }

      if (!accessToken || !refreshToken) {
        return NextResponse.json({ ok: false, error: 'missing_tokens' }, { status: 400 });
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ ok: true });
    }
    case 'SIGNED_OUT':
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true });
    default:
      return NextResponse.json({ ok: true });
  }
}
