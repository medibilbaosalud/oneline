// src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

// Listar entradas del usuario
export async function GET() {
  const jar = await cookies();                    // <-- await
  const uid = jar.get("uid")?.value;              // ajusta a tu auth real
  if (!uid) return NextResponse.json({ entries: [] });

  const { data, error } = await supabase()
    .from("journal_entries")
    .select("id, content, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [] });
}

// (Opcional) crear entrada desde aquí si lo usas
export async function POST(req: Request) {
  const jar = await cookies();                    // <-- await
  const uid = jar.get("uid")?.value;
  if (!uid) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { content } = await req.json();
  const { data, error } = await supabase()
    .from("journal_entries")
    .insert({ user_id: uid, content })
    .select("id, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data }, { status: 201 });
}