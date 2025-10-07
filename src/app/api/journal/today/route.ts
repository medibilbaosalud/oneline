import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

// Si esta ruta debe ejecutarse siempre en server (sin caché)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { entry: null, error: "unauthenticated" },
      { status: 401 }
    );
  }

  // HOY en formato YYYY-MM-DD (UTC). Si prefieres zona local, cámbialo por una util local.
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("journal")
    .select("id, user_id, day, content, preview, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("day", today)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { entry: null, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ entry: data ?? null });
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Body JSON
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const raw = (body?.content ?? "").toString();
  // Si limitas a 300 chars en el cliente, aquí puedes reforzar el límite:
  const content = raw.slice(0, 300);
  const preview = content.slice(0, 200); // opcional si tienes columna preview

  const day = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  // UPSERT por (user_id, day). Con onConflict evitamos el error de clave duplicada.
  const { data, error } = await supabase
    .from("journal")
    .upsert(
      {
        user_id: user.id,
        day,
        content,
        preview,
        updated_at: nowIso, // si tienes esta columna
      },
      { onConflict: "user_id,day" }
    )
    .select("id, user_id, day, content, preview, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry: data });
}
