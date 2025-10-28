import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { createAuthOptions, getMissingAuthEnv, resolveAuthRedirectProxy } from "@/lib/authOptions";

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

const createAuthInstance = () => {
  try {
    const instance = NextAuth(createAuthOptions());
    logPreviewContext();
    return instance;
  } catch (error) {
    console.error("[auth:init]", error);
    throw error;
  }
};

const authInstance = missingEnv.length === 0 ? createAuthInstance() : undefined;

if (missingEnv.length > 0) {
  console.error(`[auth] Missing env vars: ${missingEnv.join(", ")}`);
}

const logRedirectAttempt = (req: NextRequest) => {
  if (!shouldLog()) {
    return;
  }

  const attempted = new URL(req.url).searchParams.get("redirect_uri");
  if (attempted) {
    console.debug(`[auth] incoming redirect_uri=${attempted}`);
  }
};

export const GET = (req: NextRequest) => {
  if (!authInstance) {
    return respondWithMissingEnv();
  }

  logRedirectAttempt(req);
  return authInstance.handlers.GET(req);
};

export const POST = (req: NextRequest) => {
  if (!authInstance) {
    return respondWithMissingEnv();
  }

  logRedirectAttempt(req);
  return authInstance.handlers.POST(req);
};

export const handlers = authInstance?.handlers ?? { GET, POST };
export const auth = authInstance?.auth;
export const signIn = authInstance?.signIn;
export const signOut = authInstance?.signOut;
