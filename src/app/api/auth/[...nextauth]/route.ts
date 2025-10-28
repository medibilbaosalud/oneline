import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthDiagnostics, resolveRedirectProxy } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnostics = getAuthDiagnostics();
const redirectProxy = resolveRedirectProxy();

type NextAuthResult = ReturnType<typeof NextAuth>;

const missingResponse = () =>
  NextResponse.json(
    {
      ok: false,
      message:
        "GitHub login is not configured. Add GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing: diagnostics.missing,
      redirectProxyUrl: redirectProxy.url,
    },
    { status: 500 },
  );

let authInstance: NextAuthResult | undefined;

if (diagnostics.missing.length === 0) {
  const config = {
    providers: [
      GitHub({
        clientId: process.env.GITHUB_ID!,
        clientSecret: process.env.GITHUB_SECRET!,
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
    trustHost: true,
    basePath: "/api/auth",
    ...(redirectProxy.url ? { redirectProxyUrl: redirectProxy.url } : {}),
  } satisfies Parameters<typeof NextAuth>[0];

  authInstance = NextAuth(config);
} else {
  console.error("[auth] Missing env vars for GitHub OAuth:", diagnostics.missing.join(", "));
}

const handlers: NextAuthResult["handlers"] | undefined = authInstance?.handlers;

const missingThrower = <T extends (...args: any[]) => Promise<unknown>>(label: string) =>
  (async (..._args: Parameters<T>) => {
    throw new Error(`Missing NextAuth env vars (${label}): ${diagnostics.missing.join(", ")}`);
  }) as T;

export const auth: NextAuthResult["auth"] =
  authInstance?.auth ?? missingThrower<NextAuthResult["auth"]>("auth");

export const signIn: NextAuthResult["signIn"] =
  authInstance?.signIn ?? missingThrower<NextAuthResult["signIn"]>("signIn");

export const signOut: NextAuthResult["signOut"] =
  authInstance?.signOut ?? missingThrower<NextAuthResult["signOut"]>("signOut");

export async function GET(req: NextRequest) {
  if (!handlers) {
    return missingResponse();
  }

  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (!handlers) {
    return missingResponse();
  }

  return handlers.POST(req);
}
