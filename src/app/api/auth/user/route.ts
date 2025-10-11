import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const email = cookies().get('email')?.value; // ajusta a tu mecanismo de auth
  return NextResponse.json(email ? { email } : {});
}