import { NextRequest, NextResponse } from "next/server";

// GET /api/journal/[date]
export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  // ejemplo mínimo para compilar; aquí iría tu lectura desde Supabase
  return NextResponse.json({ ok: true, date: params.date });
}

// PUT /api/journal/[date]
export async function PUT(
  req: NextRequest,
  { params }: { params: { date: string } }
) {
  const body = await req.json().catch(() => ({} as any));
  const content: string | undefined = body?.content;
  const slot: number | undefined = body?.slot;

  // ejemplo mínimo para compilar; aquí guardarías en Supabase
  return NextResponse.json({
    ok: true,
    date: params.date,
    content: content ?? "",
    slot: typeof slot === "number" ? slot : null,
  });
}
