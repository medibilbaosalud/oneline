import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthDiagnostics, resolveRedirectProxy, type RequiredAuthEnvKey } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnostics = getAuthDiagnostics();
const redirectProxy = resolveRedirectProxy();

type NextAuthResult = ReturnType<typeof NextAuth>;

type HandlerMap = NextAuthResult["handlers"];

type FallbackResponse = {
  ok: false;
  message: string;
  missing: RequiredAuthEnvKey[];
};

const missingResponse = (): Response =>
  NextResponse.json(
    {
      ok: false,
      message:
        "GitHub login is not configured. Add GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing: diagnostics.missing,
    } satisfies FallbackResponse,
    { status: 500 },
  );

let authInstance: NextAuthResult | undefined;

if (diagnostics.missing.length === 0) {
  authInstance = NextAuth({
    providers: [
      GitHub({
        clientId: process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    trustHost: true,
    ...(redirectProxy.url ? { redirectProxyUrl: redirectProxy.url } : {}),
  });
}

const createMissingThrower = <T extends (...args: any[]) => Promise<unknown>>(): T =>
  (async (..._args: Parameters<T>) => {
    throw new Error(`Missing NextAuth env vars: ${diagnostics.missing.join(", ")}`);
  }) as T;

const handlers: HandlerMap = authInstance?.handlers ?? {
  GET: async () => missingResponse(),
  POST: async () => missingResponse(),
};

export const auth = authInstance?.auth ?? createMissingThrower<NextAuthResult["auth"]>();

export const signIn =
  authInstance?.signIn ?? createMissingThrower<NextAuthResult["signIn"]>();

export const signOut =
  authInstance?.signOut ?? createMissingThrower<NextAuthResult["signOut"]>();

export async function GET(req: NextRequest) {
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}
