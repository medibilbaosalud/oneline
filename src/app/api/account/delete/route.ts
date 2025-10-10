// src/app/api/account/delete/route.ts
import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = supabaseRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // (Opcional) lectura de confirmación
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== "DELETE") {
      return NextResponse.json({ error: "confirmation required" }, { status: 400 });
    }
  } catch {}

  // 1) Borra datos del usuario (tablas propias)
  await supabase.from("journal").delete().eq("user_id", user.id);
  await supabase.from("profiles").delete().eq("id", user.id);

  // 2) Borra el usuario de auth.users (service role)
  const admin = supabaseAdmin();
  const { error: adminError } = await admin.auth.admin.deleteUser(user.id);
  if (adminError) {
    // Si falla, al menos quedaron borrados los datos de negocio
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}