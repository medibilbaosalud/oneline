// @ts-nocheck
// src/app/api/journal/today/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs";

export const GET: any = async () => {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ entry: null, error: "unauthenticated" }, { status: 401 });
  }

  // Traer la última entrada del usuario (no usamos 'day' ni 'preview')
  const { data, error } = await supabase
    .from("journal")
    .select("id, user_id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ entry: null, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data ?? null });
};

export const POST: any = async (req: NextRequest) => {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const raw = (body?.content ?? "").toString();
  const content = raw.slice(0, 300);

  const { data, error } = await supabase
    .from("journal")
    .insert({ user_id: user.id, content })
    .select("id, user_id, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, entry: data });
};
