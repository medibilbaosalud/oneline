// src/app/api/account/accept-consent/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const legal_version = "2025-10-10";
  const legal_consent_at = new Date().toISOString();

  const { error: updateError } = await supabase.auth.updateUser({
    data: { legal_consent_at, legal_version },
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, legal_consent_at, legal_version });
}