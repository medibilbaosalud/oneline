// src/app/api/auth/user/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function GET() {
  // En Next 15, cookies() es async en route handlers
  const store = await cookies();
  const email = store.get("email")?.value ?? null; // ajusta a tu mecanismo real de auth

  return NextResponse.json(email ? { email } : {});
}