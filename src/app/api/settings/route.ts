import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

  // Fallback to defaults when no row exists yet
  return NextResponse.json({
    ok: true,
    settings: data ?? { user_id: user.id, frequency: "weekly" },
  });
}

export async function PUT(req: Request) {
  const { frequency }:{frequency?: "weekly"|"monthly"|"yearly"} = await req.json();
  if (!["weekly","monthly","yearly"].includes(frequency || "")) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, frequency });

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
