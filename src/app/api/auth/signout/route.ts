// src/app/api/auth/signout/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST() {
  const sb = supabase();
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}