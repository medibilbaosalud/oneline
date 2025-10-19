// src/lib/requireConsent.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Access gate for protected pages.
 * - If no user is found → redirect to /auth
 * - If strict=true and consent is missing → redirect to /auth
 * Returns the user when the gate passes.
 */
export async function requireConsentOrRedirect(strict: boolean = true) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  if (strict) {
    const metadata = user.user_metadata as { has_consented?: boolean } | undefined;
    const consent = metadata?.has_consented === true;
    if (!consent) redirect("/auth");
  }

  return user;
}