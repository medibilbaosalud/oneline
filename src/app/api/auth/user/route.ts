import { NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabaseRouteHandler";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = await supabaseRouteHandler();
    const {
      data: { user },
    } = await sb.auth.getUser();
    return NextResponse.json(user ? { id: user.id, email: user.email } : {});
  } catch (error) {
    console.error("[auth/user] error", error);
    return NextResponse.json({}, { status: 500 });
  }
}