import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createAuthOptions, getAuthDiagnostics } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnostics = getAuthDiagnostics();
const missing = diagnostics.missing;

const missingResponse = NextResponse.json(
  {
    ok: false,
    message:
      "GitHub login is not configured. Set GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET, then redeploy.",
    missing,
    redirectProxyUrl: diagnostics.redirectProxyUrl,
  },
  { status: 500 },
);

type NextAuthResult = ReturnType<typeof NextAuth>;

const authInstance: NextAuthResult | null =
  missing.length === 0 ? NextAuth(createAuthOptions()) : null;

const missingError = () =>
  new Error(`Missing NextAuth env vars: ${missing.join(", ") || "unknown"}`);

const fallbackAuth = ((..._args: Parameters<NextAuthResult["auth"]>) =>
  Promise.reject(missingError())) as unknown as NextAuthResult["auth"];

const fallbackSign = ((..._args: Parameters<NextAuthResult["signIn"]>) =>
  Promise.reject(missingError())) as unknown as NextAuthResult["signIn"];

const fallbackSignOut = ((..._args: Parameters<NextAuthResult["signOut"]>) =>
  Promise.reject(missingError())) as unknown as NextAuthResult["signOut"];

export const auth = authInstance?.auth ?? fallbackAuth;
export const signIn = authInstance?.signIn ?? fallbackSign;
export const signOut = authInstance?.signOut ?? fallbackSignOut;

export async function GET(req: NextRequest) {
  if (!authInstance) {
    return missingResponse;
  }

  return authInstance.handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (!authInstance) {
    return missingResponse;
  }

  return authInstance.handlers.POST(req);
}
