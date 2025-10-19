import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params; // await is required here in App Router route handlers
  return Response.json({ ok: true, date });
}
