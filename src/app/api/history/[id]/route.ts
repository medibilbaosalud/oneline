// Editar / borrar una entrada concreta
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const { content } = await req.json();
  if (typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "Invalid content" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await sb
    .from("journal_entries")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, content, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;

  const sb = supabaseServer();
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { error } = await sb
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}