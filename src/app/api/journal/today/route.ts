import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: uErr,
  } = await supabase.auth.getUser();
  if (uErr || !user) return NextResponse.json({ ok: false }, { status: 401 });

  // Guarda tal cual (si quieres evitar duplicados por día, añade una unique por fecha)
  const { error } = await supabase.from("journal").insert({
    user_id: user.id,
    content,
  });

  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
