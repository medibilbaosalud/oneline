import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import {
  createAuthOptions,
  getMissingAuthEnv,
  resolveAuthRedirectProxy,
} from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const missingEnv = getMissingAuthEnv();

const respondWithMissingEnv = () =>
  NextResponse.json(
    {
      ok: false,
      message:
        "NextAuth is not configured. Define the missing env vars in Vercel and redeploy.",
      missing: missingEnv,
    },
    { status: 500 },
  );

const shouldLog = () =>
  process.env.NODE_ENV !== "production" &&
  typeof process.env.DEBUG === "string" &&
  /auth|next-auth/.test(process.env.DEBUG);

const resolvedProxy = resolveAuthRedirectProxy();
const baseUrl =
  process.env.AUTH_REDIRECT_PROXY_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  undefined;

const logPreviewContext = () => {
  if (!shouldLog()) {
    return;
  }

  console.debug(
    `[auth] resolved redirect proxy: ${resolvedProxy.url ?? "<none>"} (source=${
      resolvedProxy.source ?? "none"
    }), baseUrl=${baseUrl ?? "<none>"}`,
  );
};

const authInstance = missingEnv.length === 0 ? NextAuth(createAuthOptions()) : undefined;

if (missingEnv.length === 0) {
  logPreviewContext();
} else {
  console.error(`[auth] Missing env vars: ${missingEnv.join(", ")}`);
}

type NextAuthContext = { params: { nextauth: string[] } };

const dispatchToAuth = async (
  req: NextRequest,
  method: "GET" | "POST",
  context: NextAuthContext,
) => {
  if (!authInstance) {
    return respondWithMissingEnv();
  }

  if (shouldLog()) {
    const attempted = new URL(req.url).searchParams.get("redirect_uri");
    if (attempted) {
      console.debug(`[auth] incoming redirect_uri=${attempted}`);
    }
  }

  try {
    const handler = authInstance.handlers[method];
    return await handler(req, context);
  } catch (error) {
    console.error("[auth:init]", error);
    throw error;
  }
};

export const GET = (req: NextRequest, context: NextAuthContext) =>
  dispatchToAuth(req, "GET", context);
export const POST = (req: NextRequest, context: NextAuthContext) =>
  dispatchToAuth(req, "POST", context);

export const handlers = { GET, POST } as const;
export const auth = authInstance?.auth;
export const signIn = authInstance?.signIn;
export const signOut = authInstance?.signOut;
