// src/app/api/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
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

  const { error } = await sb
    .from("journal") // <-- cambia a tu nombre real de tabla si es distinto
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

  const { error } = await sb
    .from("journal") // <-- cambia si tu tabla es otra
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}