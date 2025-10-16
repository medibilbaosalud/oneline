// src/app/api/auth/signout/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const s = supabaseServer();
  await s.auth.signOut();
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}