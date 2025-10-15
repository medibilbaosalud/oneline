// src/app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return NextResponse.json({
    email: user?.email ?? null,
    id: user?.id ?? null,
  });
}