// src/app/api/journal/[date]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 👇 Tipo correcto para un route-handler dinámico
type Ctx = { params: { date: string } };

// GET /api/journal/[date]
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { date } = params;
  // ✅ De aquí hacia abajo deja tu lógica tal cual la tenías
  // ... tu código actual (lectura de entrada, supabase, etc.) ...
  return NextResponse.json({ ok: true, date });
}

// POST /api/journal/[date]
export async function POST(req: NextRequest, { params }: Ctx) {
  const { date } = params;
  // ✅ De aquí hacia abajo deja tu lógica tal cual la tenías
  // ... tu código actual (validación body, upsert en supabase, etc.) ...
  return NextResponse.json({ ok: true, date });
}
