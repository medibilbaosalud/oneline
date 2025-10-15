// src/app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabase();
  const { data: { user } } = await sb.auth.getUser();
  return NextResponse.json(user ? { email: user.email } : {});
}