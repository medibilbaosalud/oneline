import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { createAuthConfig, getAuthDiagnostics } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const diagnostics = getAuthDiagnostics();

const respondMissing = async () =>
  NextResponse.json(
    {
      ok: false,
      message:
        "NextAuth is not configured. Add GITHUB_ID, GITHUB_SECRET, and NEXTAUTH_SECRET in Vercel, then redeploy.",
      missing: diagnostics.missing,
    },
    { status: 500 },
  );

const fallbackHandlers = {
  GET: (_req: NextRequest) => respondMissing(),
  POST: (_req: NextRequest) => respondMissing(),
} satisfies ReturnType<typeof NextAuth>["handlers"];

const authInstance =
  diagnostics.missing.length === 0
    ? NextAuth(createAuthConfig())
    : ({
        handlers: fallbackHandlers,
        auth: async () => null,
        signIn: async () => {
          throw new Error(`Missing NextAuth env vars: ${diagnostics.missing.join(", ")}`);
        },
        signOut: async () => {
          throw new Error(`Missing NextAuth env vars: ${diagnostics.missing.join(", ")}`);
        },
      } as ReturnType<typeof NextAuth>);

export const { handlers, auth, signIn, signOut } = authInstance;
export const { GET, POST } = handlers;
