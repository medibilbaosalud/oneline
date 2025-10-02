// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    // Si faltan variables de entorno, no intentamos inicializar Supabase.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && anon) {
      const supabase = createMiddlewareClient({ req, res });
      // Sin redirecciones ni nada: solo sincroniza sesión/cookies.
      await supabase.auth.getSession();
    }
  } catch (err) {
    // En middleware NUNCA lances errores; loguea y deja pasar.
    console.error("middleware error:", err);
  }

  return res;
}

// Evita ejecutarlo en estáticos y assets del framework.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|icon.svg).*)",
  ],
};
