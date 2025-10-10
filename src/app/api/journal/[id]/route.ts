import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs"; // opcional

export async function PATCH(req: NextRequest, context: any) {
  // Compatibilidad: params puede venir como objeto o como Promise del objeto
  let id = "";
  try {
    const p = context?.params;
    id = p && typeof p.then === "function" ? (await p).id : (p?.id as string);
  } catch {
    /* id se quedará "" si no se puede leer */
  }

  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const content = (body?.content ?? "").toString().slice(0, 300);

  const { data, error } = await supabase
    .from("journal")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
