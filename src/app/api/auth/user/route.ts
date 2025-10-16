// src/app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();

  return NextResponse.json(
    user ? { id: user.id, email: user.email } : {},
    { headers: { "Cache-Control": "no-store" } }
  );
}