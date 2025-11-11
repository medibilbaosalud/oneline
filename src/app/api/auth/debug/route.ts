import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    envNEXTAUTH_URL: process.env.NEXTAUTH_URL,
    envVERCEL_URL: process.env.VERCEL_URL,
    node: process.version,
    hint: 'Open /api/auth/session after logging in to verify there is a user object.',
  });
}
