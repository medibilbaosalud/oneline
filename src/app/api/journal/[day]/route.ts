// src/app/api/journal/[day]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

async function resolveParams(ctx: any) {
  // Next 15 puede pasar params como Promise o como objeto simple.
  const maybe = ctx?.params;
  if (!maybe) return {};
  // Si tiene .then, asumimos Promise
  if (typeof maybe.then === "function") {
    return await maybe;
  }
  return maybe;
}

export async function GET(req: NextRequest, ctx: any) {
  const { day } = await resolveParams(ctx);

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("journal")
    .select("id, day, content, preview, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    entry: data
      ? {
          id: data.id,
          day: data.day,
          content: (data as any).content ?? null,
          preview: (data as any).preview ?? null,
          created_at: (data as any).created_at ?? null,
          updated_at: (data as any).updated_at ?? null,
        }
      : null,
  });
}

export async function POST(req: NextRequest, ctx: any) {
  const { day } = await resolveParams(ctx);

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const preview = content.slice(0, 200);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("journal")
    .upsert(
      {
        user_id: user.id,
        day,
        content,
        preview,
        updated_at: nowIso,
      },
      { onConflict: "user_id,day" }
    )
    .select("id, day, content, preview, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry: data });
}
