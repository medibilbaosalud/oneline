export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("[POST /journal/today] 401 unauthenticated");
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error("[POST /journal/today] invalid json:", e);
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }

    const raw = (body?.content ?? "").toString();
    const content = raw.slice(0, 300);
    const preview = content.slice(0, 200);
    const day = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    console.log("[POST /journal/today] upsert", {
      user_id: user.id, day, contentLen: content.length, t: nowIso,
    });

    const { data, error } = await supabase
      .from("journal")
      .upsert(
        { user_id: user.id, day, content, preview, updated_at: nowIso },
        { onConflict: "user_id,day" }
      )
      .select("id,user_id,day,content,preview,created_at,updated_at")
      .maybeSingle();

    if (error) {
      console.error("[POST /journal/today] supabase error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log("[POST /journal/today] ok in", Date.now() - started, "ms");
    return NextResponse.json({ ok: true, entry: data ?? null });
  } catch (err: any) {
    // Paracaídas: nunca devolvemos sin JSON
    console.error("[POST /journal/today] fatal:", err);
    return NextResponse.json({ ok: false, error: err?.message || "internal error" }, { status: 500 });
  }
}
