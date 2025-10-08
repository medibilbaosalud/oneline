import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const runtime = "nodejs";         // serverless (no edge)
export const dynamic = "force-dynamic";  // sin caché

// Devuelve la última entrada del usuario (opcional, solo para que el GET no rompa)
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ entry: null }, { status: 401 });

    const { data, error } = await supabase
      .from("journal")
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ entry: data ?? null });
  } catch (err: any) {
    console.error("/api/journal/today GET", err);
    return NextResponse.json({ error: err?.message ?? "internal" }, { status: 500 });
  }
}

// Inserta una nueva entrada (SIN day/preview)
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const content = String(body?.content ?? "").slice(0, 300);  // tope 300 chars
    if (!content.trim()) return NextResponse.json({ error: "empty" }, { status: 400 });

    const { data, error } = await supabase
      .from("journal")
      .insert({ user_id: user.id, content })
      .select("id, content, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, entry: data });
  } catch (err: any) {
    console.error("/api/journal/today POST", err);
    return NextResponse.json({ error: err?.message ?? "internal" }, { status: 500 });
  }
}
