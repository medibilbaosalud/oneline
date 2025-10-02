import type { NextRequest } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params; // 👈 AHORA sí: await
  return Response.json({ ok: true, date });
}
