import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ ok: true });
}

// Si tu cron hace POST, añade también:
// export async function POST() {
//   return NextResponse.json({ ok: true });
// }
