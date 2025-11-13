import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = createRouteHandlerClient({ cookies });

  const { error } = await supabase.auth.exchangeCodeForSession();
  if (error) {
    console.error('exchangeCodeForSession ERROR:', error);
    return NextResponse.redirect(new URL('/auth?error=oauth', url.origin));
  }

  const next = url.searchParams.get('next');
  const safeNext = next && next.startsWith('/') ? next : '/';
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
