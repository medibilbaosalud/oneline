import { NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabaseRouteHandler";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const sb = await supabaseRouteHandler();
    await sb.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/signout] error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}