// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Esta llamada hidrata/renueva las cookies de sesión en cada request
  await supabase.auth.getSession();

  return res;
}

// Excluye assets estáticos
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth|auth).*)'],
};
