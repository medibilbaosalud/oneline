// src/app/api/history/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// EDITAR
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { content } = await req.json();

  async function upd(table: "entries" | "journal") {
    return s.from(table).update({ content }).eq("id", params.id).eq("user_id", user.id).select("id").single();
  }

  let { error } = await upd("entries");
  if (error) ({ error } = await upd("journal"));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

// BORRAR
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const s = supabaseServer();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  async function del(table: "entries" | "journal") {
    return s.from(table).delete().eq("id", params.id).eq("user_id", user.id);
  }

  let { error } = await del("entries");
  if (error) ({ error } = await del("journal"));
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}