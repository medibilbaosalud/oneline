// src/app/api/summaries/run/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';       // opcional, por si usas libs de Node
export const dynamic = 'force-dynamic'; // no SSG

// Export at least one HTTP method (GET or POST)
export async function GET() {
// Add the real logic here once you wire it up
  return NextResponse.json({ ok: true });
}

// (Optional) Add POST if your cron calls it
export async function POST() {
  return NextResponse.json({ ok: true });
}
