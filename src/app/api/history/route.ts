// src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

/**
 * GET -> devuelve las entradas del usuario actual (journal/history)
 */
export async function GET() {
  try {
    const client = supabase();
    // Recupera la sesión/usuario actual de forma segura
    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr) {
      // no debemos filtrar por cookies manualmente; devolvemos vacío si no hay user
      return NextResponse.json({ entries: [] });
    }
    const user = userData.user;
    if (!user) return NextResponse.json({ entries: [] });

    const uid = user.id;

    const { data, error } = await client
      .from("journal")
      .select("id, content, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "internal_error" }, { status: 500 });
  }
}