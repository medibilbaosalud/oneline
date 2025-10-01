// src/app/api/journal/[date]/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';


type RouteContext = { params: { date: string } };

// GET /api/journal/2025-10-01
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { date } = params; // <-- NO es Promise
  // TODO: leer de Supabase si quieres
  return NextResponse.json({ ok: true, date });
}

// PUT /api/journal/2025-10-01
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { date } = params;
  const body = await req.json().catch(() => ({} as any));
  const content = typeof body?.content === 'string' ? body.content : '';

  // TODO: aquí haces el upsert a Supabase (entries)
  // Ejemplo (pseudo):
  // const supabase = createServerClient();
  // await supabase.from('entries').upsert({ user_id, entry_date: date, slot: 1, content });

  return NextResponse.json({ ok: true, date, saved: true });
}
