// src/app/api/account/delete/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // OJO: hay que AWAIT aquí
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Borra todos los datos del usuario (ajusta tablas si necesitas)
  const delJournal = await sb.from("journal").delete().eq("user_id", user.id);
  if (delJournal.error) {
    return NextResponse.json({ error: delJournal.error.message }, { status: 500 });
  }

  // Si además quieres eliminar al usuario de auth, eso se hace desde el dashboard de Supabase
  // con service key (admin). Aquí sólo cerramos sesión.
  await sb.auth.signOut();

  return NextResponse.json({ ok: true });
}