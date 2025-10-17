// src/app/api/history/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sb = await supabaseServer();

  const {
    data: { user },
    error: authErr,
  } = await sb.auth.getUser();

  // If the user is missing, return an empty list and exit early.
  if (authErr || !user) {
    return NextResponse.json({ entries: [] });
  }

  const table = process.env.NEXT_PUBLIC_SUPABASE_TABLE || "journal";

  const { data, error } = await sb
    .from(table)
    .select("id, content, created_at")
    .eq("user_id", user.id) // <- ahora TS sabe que user no es null
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ entries: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    entries: (data || []).map((r) => ({
      id: r.id,
      content: r.content,
      created_at: r.created_at,
    })),
  });
}