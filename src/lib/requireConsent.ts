// src/lib/requireConsent.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Gate de acceso para páginas protegidas.
 * - Si no hay usuario → /auth
 * - Si strict=true y el usuario no ha aceptado → /auth
 * Devuelve el usuario si pasa el gate.
 */
export async function requireConsentOrRedirect(strict: boolean = true) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  if (strict) {
    const consent = (user.user_metadata as any)?.has_consented === true;
    if (!consent) redirect("/auth");
  }

  return user;
}