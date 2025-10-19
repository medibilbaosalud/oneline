import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ ok: true });
}

// Add POST handler if your cron uses it
// export async function POST() {
//   return NextResponse.json({ ok: true });
// }
