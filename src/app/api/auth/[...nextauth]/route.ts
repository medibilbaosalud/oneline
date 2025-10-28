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

const respondMissing = () =>
  NextResponse.json(
    {
      ok: false,
      message:
        "NextAuth is not configured. Add GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing: diagnostics.missing,
    },
    { status: 500 },
  );

const createThrower = <T extends (...args: any[]) => Promise<unknown>>(label: string) =>
  (async (..._args: Parameters<T>): Promise<never> => {
    throw new Error(`Missing NextAuth env vars (${label}): ${diagnostics.missing.join(", ")}`);
  }) as T;

const fallbackHandlers: HandlerMap = {
  GET: async (_req: NextRequest, _ctx) => respondMissing(),
  POST: async (_req: NextRequest, _ctx) => respondMissing(),
};

let handlers: HandlerMap;
let auth: AuthFn;
let signIn: SignInFn;
let signOut: SignOutFn;
let unstable_update: UpdateFn;

if (diagnostics.missing.length === 0) {
  const authInstance = NextAuth(createAuthConfig());
  handlers = authInstance.handlers;
  auth = authInstance.auth;
  signIn = authInstance.signIn;
  signOut = authInstance.signOut;
  unstable_update = authInstance.unstable_update;
} else {
  console.error(
    "[auth:config] Missing NextAuth env vars",
    JSON.stringify({ missing: diagnostics.missing }, null, 2),
  );
  handlers = fallbackHandlers;
  auth = createThrower<AuthFn>("auth");
  signIn = createThrower<SignInFn>("signIn");
  signOut = createThrower<SignOutFn>("signOut");
  unstable_update = createThrower<UpdateFn>("unstable_update");
}

export { handlers, auth, signIn, signOut, unstable_update };

export const GET = (req: NextRequest, context: Parameters<HandlerMap["GET"]>[1]) =>
  handlers.GET(req, context);
export const POST = (req: NextRequest, context: Parameters<HandlerMap["POST"]>[1]) =>
  handlers.POST(req, context);
