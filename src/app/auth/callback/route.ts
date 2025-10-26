import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/onboarding/vault";
  const code = url.searchParams.get("code");

  if (!code) {
    const redirectUrl = new URL("/signin", url.origin);
    redirectUrl.searchParams.set("redirectTo", next);
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorUrl = new URL("/signin", url.origin);
    errorUrl.searchParams.set("redirectTo", next);
    errorUrl.searchParams.set("error", "callback_failed");
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  const nextUrl = new URL(next, url.origin);
  return NextResponse.redirect(nextUrl, { status: 302 });
}
