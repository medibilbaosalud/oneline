import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectToParam = url.searchParams.get("redirectTo");
  const safeRedirect = redirectToParam && redirectToParam.startsWith("/") ? redirectToParam : null;

  if (!code) {
    const target = safeRedirect ?? "/?signup=missing";
    const missingUrl = new URL(target, url.origin);
    return NextResponse.redirect(missingUrl, { status: 302 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const target = safeRedirect ?? "/?signup=error";
    const errorUrl = new URL(target, url.origin);
    return NextResponse.redirect(errorUrl, { status: 302 });
  }

  const target = safeRedirect ?? "/?signup=ok";
  const successUrl = new URL(target, url.origin);
  return NextResponse.redirect(successUrl, { status: 302 });
}
