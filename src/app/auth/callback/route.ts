// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  // Intercambia el "code" por una sesión y guarda cookies
  await supabase.auth.exchangeCodeForSession(request.url);
  // Redirige al diario
  return NextResponse.redirect(new URL('/today', request.url));
}
