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

const respondMissing: HandlerMap["GET"] = async (_req, _ctx) =>
  NextResponse.json(
    {
      ok: false,
      message:
        "NextAuth is not configured. Add GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing: diagnostics.missing,
    },
    { status: 500 },
  );

const createThrower = <T extends (...args: any[]) => unknown>(label: string) =>
  ((..._args: Parameters<T>) => {
    throw new Error(`Missing NextAuth env vars (${label}): ${diagnostics.missing.join(", ")}`);
  }) as T;

const fallbackAuth = (() => {
  const handlers: HandlerMap = {
    GET: respondMissing,
    POST: async (req, ctx) => respondMissing(req, ctx),
  };

  return {
    handlers,
    auth: createThrower<AuthFn>("auth"),
    signIn: createThrower<SignInFn>("signIn"),
    signOut: createThrower<SignOutFn>("signOut"),
    unstable_update: createThrower<UpdateFn>("unstable_update"),
  } as unknown as NextAuthResult;
})();

const authInstance: NextAuthResult =
  diagnostics.missing.length === 0 ? NextAuth(createAuthConfig()) : fallbackAuth;

export const { handlers, auth, signIn, signOut, unstable_update } = authInstance;

export const GET: HandlerMap["GET"] = (req: NextRequest, ctx) => handlers.GET(req, ctx);
export const POST: HandlerMap["POST"] = (req: NextRequest, ctx) => handlers.POST(req, ctx);
