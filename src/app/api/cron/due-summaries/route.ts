// src/app/api/cron/due-summaries/route.ts
import { NextResponse } from 'next/server';

// Opt into the Node.js runtime on Vercel when needed
export const runtime = 'nodejs';
// Para que no se cachee:
export const dynamic = 'force-dynamic';

/**
 * Cron (GET) — placeholder that currently returns OK.
 * Add your "due summaries" logic here later.
 */
export async function GET() {
  try {
    // TODO: implement logic to find which users are due for a summary and generate it
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

