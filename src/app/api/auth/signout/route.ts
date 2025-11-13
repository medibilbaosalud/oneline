import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function POST() {
  const sb = createRouteHandlerClient({ cookies });
  await sb.auth.signOut();
  return NextResponse.json({ ok: true });
}