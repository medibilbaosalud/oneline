import { NextResponse } from "next/server";
import { supabaseRouteHandler } from "@/lib/supabaseRouteHandler";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password, mode }: { email: string; password: string; mode?: "signin" | "signup" } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    const sb = await supabaseRouteHandler();
    const origin = new URL(req.url).origin;

    const { data, error } =
      mode === "signup"
        ? await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
          },
        })
        : await sb.auth.signInWithPassword({ email, password });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    let user = data.user ?? null;

    if (mode === "signup" && !data.session) {
      const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({ email, password });
      if (signInError) return NextResponse.json({ error: signInError.message }, { status: 400 });
      user = signInData.user ?? user;
    }

    if (mode === "signup" && user?.id) {
      const { error: statusError } = await sb
        .from("user_vault_status")
        .upsert({ user_id: user.id, has_passphrase: false })
        .eq("user_id", user.id);

      if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    // On success the Supabase auth helpers set the session cookie for us.
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    console.error("[auth/signin] error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}