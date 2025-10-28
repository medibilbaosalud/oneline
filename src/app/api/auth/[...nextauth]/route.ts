import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createAuthConfig, getAuthDiagnostics } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NextAuthResult = ReturnType<typeof NextAuth>;
type HandlerMap = NextAuthResult["handlers"];
type AuthFn = NextAuthResult["auth"];
type SignInFn = NextAuthResult["signIn"];
type SignOutFn = NextAuthResult["signOut"];
type UpdateFn = NextAuthResult["unstable_update"];

const diagnostics = getAuthDiagnostics();

const respondMissing = (async (_req: NextRequest) =>
  NextResponse.json(
    {
      ok: false,
      message:
        "NextAuth is not configured. Add GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing: diagnostics.missing,
    },
    { status: 500 },
  )) as HandlerMap["GET"];

const createThrower = (label: string) =>
  ((..._args: unknown[]) => {
    throw new Error(`Missing NextAuth env vars (${label}): ${diagnostics.missing.join(", ")}`);
  }) as unknown;

const fallbackAuth = (() => {
  const handlers: HandlerMap = {
    GET: respondMissing,
    POST: respondMissing,
  };

  return {
    handlers,
    auth: createThrower("auth") as AuthFn,
    signIn: createThrower("signIn") as SignInFn,
    signOut: createThrower("signOut") as SignOutFn,
    unstable_update: createThrower("unstable_update") as UpdateFn,
  } as unknown as NextAuthResult;
})();

const authInstance: NextAuthResult =
  diagnostics.missing.length === 0 ? NextAuth(createAuthConfig()) : fallbackAuth;

export const { handlers, auth, signIn, signOut, unstable_update } = authInstance;

type NextAuthRouteContext = { params: Promise<{ nextauth: string[] }> };

export async function GET(req: NextRequest, _context: NextAuthRouteContext) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest, _context: NextAuthRouteContext) {
  return handlers.POST(req);
}
