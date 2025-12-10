import { NextRequest, NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabaseRouteHandler";

import { ENTRY_LIMIT_EXTENDED } from "@/lib/summaryPreferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getParam(context: unknown, name: string) {
  const p = (context as { params?: unknown })?.params;
  if (p && typeof (p as Promise<unknown>).then === "function") {
    const v = await (p as Promise<Record<string, string>>);
    return v?.[name];
  }
  return (p as Record<string, string>)?.[name];
}

export async function PATCH(req: NextRequest, context: unknown) {
  try {
    const id = await getParam(context, "id");
    const supabase = await supabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    let body: { content?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

    const content = String(body?.content ?? "").slice(0, ENTRY_LIMIT_EXTENDED);

    const { data, error } = await supabase
      .from("journal")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, content, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  } catch (error) {
    console.error("[journal-item PATCH] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: unknown) {
  try {
    const id = await getParam(context, "id");
    const supabase = await supabaseRouteHandler();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const { error } = await supabase
      .from("journal")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[journal-item DELETE] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}