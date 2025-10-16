// src/app/api/account/export/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 👇 importante: esperar a que se cree el cliente
    const sb = await supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr) throw userErr;
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Usa el nombre de tabla que tengas en producción.
    // Si tu tabla es distinta, cámbiala aquí.
    const { data, error } = await sb
      .from("journal")
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ entries: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Export failed" },
      { status: 500 },
    );
  }
}