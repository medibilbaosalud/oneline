// src/app/api/journal/[date]/route.ts
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: { date: string } };

// GET /api/journal/2025-10-01
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { date } = params; // <- params es un OBJETO, NO un Promise
  // TODO: lee las entradas de ese día desde tu DB si quieres
  return NextResponse.json({ ok: true, date });
}

// POST /api/journal/2025-10-01
export async function POST(req: NextRequest, { params }: Ctx) {
  const { date } = params;
  const body = await req.json().catch(() => ({} as any));

  // TODO: guarda en DB. Aquí sólo validamos y devolvemos.
  if (typeof body?.content !== 'string') {
    return NextResponse.json(
      { ok: false, error: 'content must be a string' },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, date, saved: { content: body.content } });
}

// Opcional (por si quieres controlar métodos no soportados)
export function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}