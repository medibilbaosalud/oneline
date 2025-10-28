import NextAuth from "next-auth";

import {
  createAuthOptions,
  getMissingAuthEnv,
  resolveAuthRedirectProxy,
} from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const missingEnv = getMissingAuthEnv();

const respondWithMissingEnv = () =>
  new Response(
    JSON.stringify({
      ok: false,
      message:
        "NextAuth is not configured. Define the missing env vars in Vercel and redeploy.",
      missing: missingEnv,
    }),
    {
      status: 500,
      headers: {
        "content-type": "application/json",
      },
    },
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

const nextAuthHandler = missingEnv.length === 0 ? NextAuth(createAuthOptions()) : null;

if (missingEnv.length === 0) {
  logPreviewContext();
} else {
  console.error(`[auth] Missing env vars: ${missingEnv.join(", ")}`);
}

const handleRequest = async (req: Request) => {
  if (missingEnv.length > 0 || !nextAuthHandler) {
    return respondWithMissingEnv();
  }

  if (shouldLog()) {
    const attempted = new URL(req.url).searchParams.get("redirect_uri");
    if (attempted) {
      console.debug(`[auth] incoming redirect_uri=${attempted}`);
    }
  }

  try {
    return await nextAuthHandler(req);
  } catch (error) {
    console.error("[auth:init]", error);
    throw error;
  }
};

export const GET = handleRequest;
export const POST = handleRequest;
export const handlers = { GET, POST } as const;
