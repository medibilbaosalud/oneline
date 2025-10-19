import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      error: 'This endpoint is deprecated. Use POST /api/generate-story with client-side decrypted text.',
    },
    { status: 410, headers: { 'cache-control': 'no-store' } },
  );
}

// SECURITY WARNING: Plaintext generation moved to /api/generate-story to respect end-to-end encryption.
