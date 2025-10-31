import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createAuthConfig,
  getAuthDiagnostics,
} from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnostics = getAuthDiagnostics();
const missing = diagnostics.missing;

const missingResponse = () =>
  NextResponse.json(
    {
      ok: false,
      message:
        "GitHub login is not configured. Set GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing,
      redirectProxyUrl: diagnostics.redirectProxyUrl,
    },
    { status: 500 },
  );

type NextAuthResult = ReturnType<typeof NextAuth>;

const authInstance: NextAuthResult | null =
  missing.length === 0 ? NextAuth(createAuthConfig()) : null;

const handlers = authInstance?.handlers;

const rejection = (label: string) =>
  Promise.reject(
    new Error(`Missing NextAuth env vars (${label}): ${missing.join(", ") || "unknown"}`),
  );

export const auth: NextAuthResult["auth"] =
  authInstance?.auth ?? ((..._args: Parameters<NextAuthResult["auth"]>) => rejection("auth")) as NextAuthResult["auth"];

export const signIn: NextAuthResult["signIn"] =
  authInstance?.signIn ??
  ((..._args: Parameters<NextAuthResult["signIn"]>) => rejection("signIn")) as NextAuthResult["signIn"];

export const signOut: NextAuthResult["signOut"] =
  authInstance?.signOut ??
  ((..._args: Parameters<NextAuthResult["signOut"]>) => rejection("signOut")) as NextAuthResult["signOut"];

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
