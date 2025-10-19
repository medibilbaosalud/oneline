// src/app/api/account/delete/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  // Await here to ensure the server client is ready
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Remove all user data (adjust table names if needed)
  const delJournal = await sb.from("journal").delete().eq("user_id", user.id);
  if (delJournal.error) {
    return NextResponse.json({ error: delJournal.error.message }, { status: 500 });
  }

  // To delete the auth user entirely, call the admin API with the service key outside this handler.
  // Here we only clear the current session.
  await sb.auth.signOut();

  return NextResponse.json({ ok: true });
}