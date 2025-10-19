import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password, mode }: { email: string; password: string; mode?: "signin"|"signup" } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const sb = await supabaseServer();

  const { data, error } =
    mode === "signup"
      ? await sb.auth.signUp({ email, password })
      : await sb.auth.signInWithPassword({ email, password });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // On success the session cookie has already been set by supabaseServer()
  return NextResponse.json({ ok: true, user: data.user ?? null });
}