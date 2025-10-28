import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import {
  createAuthConfig,
  getMissingAuthEnv,
  resolveAuthRedirectProxy,
} from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const shouldLog = () =>
  process.env.NODE_ENV !== "production" &&
  typeof process.env.DEBUG === "string" &&
  /auth|next-auth/.test(process.env.DEBUG);

const missingEnvAtBoot = getMissingAuthEnv();

if (missingEnvAtBoot.length > 0) {
  console.error(`[auth] Missing env vars: ${missingEnvAtBoot.join(", ")}`);
}

const logPreviewContext = () => {
  if (!shouldLog()) {
    return;
  }

  const resolvedProxy = resolveAuthRedirectProxy();
  console.debug(
    `[auth] redirect proxy ${resolvedProxy.url ?? "<none>"} (source=${
      resolvedProxy.source ?? "none"
    })`,
  );
};

const respondWithMissingEnv = () =>
  NextResponse.json(
    {
      ok: false,
      message:
        "NextAuth is not configured. Define the missing env vars (GITHUB_ID, GITHUB_SECRET, NEXTAUTH_SECRET/AUTH_SECRET) in Vercel and redeploy.",
      missing: missingEnvAtBoot,
    },
    { status: 500 },
  );

let authInstance: ReturnType<typeof NextAuth> | undefined;

const ensureAuthInstance = () => {
  if (authInstance) {
    return authInstance;
  }

  try {
    authInstance = NextAuth(createAuthConfig());
    logPreviewContext();
  } catch (error) {
    console.error("[auth:init]", error);
    throw error;
  }

  return authInstance;
};

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
  if (missingEnvAtBoot.length > 0) {
    return respondWithMissingEnv();
  }

  logRedirectAttempt(req);
  return ensureAuthInstance().handlers.GET(req);
};

export const POST = (req: NextRequest) => {
  if (missingEnvAtBoot.length > 0) {
    return respondWithMissingEnv();
  }

  logRedirectAttempt(req);
  return ensureAuthInstance().handlers.POST(req);
};

const exported = missingEnvAtBoot.length === 0 ? ensureAuthInstance() : undefined;

export const handlers = exported?.handlers ?? { GET, POST };
export const auth = exported?.auth;
export const signIn = exported?.signIn;
export const signOut = exported?.signOut;
