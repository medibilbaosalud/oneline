import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    // Intercambia el código por la sesión y deja la cookie set
    await supabase.auth.exchangeCodeForSession(code);
  }

  // A donde enviar tras login
  return NextResponse.redirect(new URL('/today', request.url));
}
