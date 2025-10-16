// src/app/api/export/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const s = await supabaseServer(); // <-- IMPORTANTE: await

    const {
      data: { user },
    } = await s.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Ajusta columnas si tu tabla tiene otras
    const { data, error } = await s
      .from("journal")
      .select("id, day, content, created_at")
      .eq("user_id", user.id)
      .order("day", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ entries: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}