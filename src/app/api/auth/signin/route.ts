import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password, mode }: { email: string; password: string; mode?: "signin" | "signup" } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }
  const sb = createRouteHandlerClient({ cookies });
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

  // On success the Supabase auth helpers set the session cookie for us.
  return NextResponse.json({ ok: true, user: data.user ?? null });
}