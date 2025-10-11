// src/lib/requireConsent.ts
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export async function requireConsentOrRedirect() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return; // si no hay user, que la página haga su propio control de login

  const legal = (user.user_metadata as any)?.legal_consent_at;
  if (!legal) {
    redirect("/legal-consent");
  }
}