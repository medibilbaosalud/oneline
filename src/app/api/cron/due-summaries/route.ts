// src/app/api/cron/due-summaries/route.ts
import { NextResponse } from 'next/server';

// Si quieres forzar a que sea función Node.js en Vercel:
export const runtime = 'nodejs';
// Para que no se cachee:
export const dynamic = 'force-dynamic';

/**
 * Cron (GET) — sólo devuelve OK por ahora.
 * Aquí dentro luego pondremos la lógica real de "due summaries".
 */
export async function GET() {
  try {
    // TODO: tu lógica para comprobar qué usuarios tienen “summary” tocando y generarlo
    // Por ahora devolvemos un OK para que el build no falle.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('due-summaries error', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'unknown' },
      { status: 500 }
    );
  }
}

