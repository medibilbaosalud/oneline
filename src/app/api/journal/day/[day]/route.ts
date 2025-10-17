// @ts-nocheck
// src/app/api/journal/day/[day]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";
// export const runtime = "nodejs"; // si usas SDKs que requieren Node

export const POST: any = async (req: NextRequest, context: any) => {
  // Compat: params puede venir como objeto o como Promise
  let day = "";
  try {
    const p = context?.params;
    day = p && typeof p.then === "function" ? (await p).day : p?.day;
  } catch {}

  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/auth?next=/history/${day}`, req.url));
  }

  // Form: application/x-www-form-urlencoded
  const form = await req.formData();
  const raw = String(form.get("content") ?? "");
  const content = raw.slice(0, 300);

  const { error } = await supabase
    .from("journal")
    .upsert(
      { user_id: user.id, day, content, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" }
    );

  if (error) {
    return NextResponse.redirect(
      new URL(`/history/${day}?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }
  return NextResponse.redirect(new URL(`/history`, req.url));
};
