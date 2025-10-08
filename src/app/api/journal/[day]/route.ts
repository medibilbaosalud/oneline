import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { day: string } }
) {
  const { day } = params;
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("journal")
    .select("id, day, content, preview, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data ?? null });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { day: string } }
) {
  const { day } = params;
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const raw = (body?.content ?? "").toString();
  const content = raw.slice(0, 300);
  const preview = content.slice(0, 200);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("journal")
    .update({ content, preview, updated_at: nowIso })
    .eq("user_id", user.id)
    .eq("day", day)
    .select("id, user_id, day, content, preview, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, entry: data });
}
