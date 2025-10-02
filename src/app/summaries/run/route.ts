// src/app/api/summaries/run/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';       // opcional, por si usas libs de Node
export const dynamic = 'force-dynamic'; // no SSG

// Exporta al menos un método HTTP (GET o POST)
export async function GET() {
  // si luego añades lógica real, colócala aquí
  return NextResponse.json({ ok: true });
}

// (opcional) si tu cron envía POST, añade también:
export async function POST() {
  return NextResponse.json({ ok: true });
}
