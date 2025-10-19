// src/app/api/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getJournalTable } from "@/lib/getJournalTable";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

// PATCH /api/history/:id  -> actualizar contenido
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "invalid_content" }, { status: 400 });
  }

  const table = getJournalTable();

  const { error } = await sb
    .from(table)
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/history/:id  -> borrar entrada
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const sb = await supabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const table = getJournalTable();

  const { data, error } = await sb
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .single();

  if (error) {
    if (error.code === "PGRST116" || error.code === "PGRST119") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id ?? id });
}
