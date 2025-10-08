import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "1900-01-01";
  const to = searchParams.get("to") ?? "2999-12-31";
  const limit = Number(searchParams.get("limit") ?? 60);

  const { data, error } = await supabase
    .from("journal")
    .select("id, day, preview, content, created_at, updated_at")
    .eq("user_id", user.id)
    .gte("day", from)
    .lte("day", to)
    .order("day", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
