import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const Upsert = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.number().int().min(1).max(2),
  content: z.string().max(300),
  isPinned: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Upsert.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { entryDate, slot, content, isPinned = false } = parsed.data;
  const { data, error } = await supabase
    .from("entries")
    .upsert(
      { user_id: user.id, entry_date: entryDate, slot, content, is_pinned: isPinned },
      { onConflict: "user_id,entry_date,slot" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    id: data.id, entryDate: data.entry_date, slot: data.slot,
    content: data.content, isPinned: data.is_pinned
  });
}

export async function GET() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("entries")
    .select("id,entry_date,slot,content,is_pinned,created_at,updated_at")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("slot", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}
