// src/app/api/journal/day/[day]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { day: string } }
) {
  const day = params.day; // YYYY-MM-DD
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=/history/${day}`, req.url));

  // El form es application/x-www-form-urlencoded
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
}
