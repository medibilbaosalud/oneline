import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    const missingUrl = new URL("/?signup=missing", url.origin);
    return NextResponse.redirect(missingUrl, { status: 302 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/?signup=error", url.origin);
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  const successUrl = new URL("/?signup=ok", url.origin);
  return NextResponse.redirect(successUrl, { status: 302 });
}
