// src/app/api/entries/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

const Upsert = z.object({
  id: z.string().uuid().optional(),
  content: z.string().min(1).max(300),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
});

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const parsed = Upsert.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const { id, content } = parsed.data;
    const day = parsed.data.day ?? new Date().toISOString().slice(0, 10);

    let result;
    if (id) {
      // actualizar existente
      result = await supabase
        .from("journal")
        .update({ content })
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, content, created_at, day")
        .single();
    } else {
      // Unique upsert per (user_id, day)
      result = await supabase
        .from("journal")
        .upsert([{ user_id: user.id, content, day }], {
          onConflict: "user_id,day",
          ignoreDuplicates: false,
        })
        .select("id, content, created_at, day")
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ entry: result.data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "server error" },
      { status: 500 }
    );
  }
}