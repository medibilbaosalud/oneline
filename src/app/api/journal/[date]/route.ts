import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: { date: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { date } = params;
  // ...tu lógica...
  return NextResponse.json({ ok: true, date });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { date } = params;
  // ...tu lógica...
  return NextResponse.json({ ok: true, date });
}
