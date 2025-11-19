import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();
  return NextResponse.json(user ? { id: user.id, email: user.email } : {});
}