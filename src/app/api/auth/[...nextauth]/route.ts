import NextAuth from "next-auth";

import { createAuthOptions, getMissingAuthEnv } from "@/lib/authOptions";

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

const resolveBaseUrl = () =>
  process.env.AUTH_REDIRECT_PROXY_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || undefined;

const logPreviewInfo = (baseUrl: string | undefined) => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (typeof process.env.DEBUG === "string" && /auth|next-auth/.test(process.env.DEBUG)) {
    console.debug(`[auth] resolved baseUrl=${baseUrl ?? "undefined"}`);
  }
};

const createHandler = () => {
  if (missingEnv.length > 0) {
    console.error(`[auth] Missing env vars: ${missingEnv.join(", ")}`);
    return async (_req: Request) => respondWithMissingEnv();
  }

  const baseUrl = resolveBaseUrl();
  logPreviewInfo(baseUrl);

  try {
    const nextAuthHandler = NextAuth(createAuthOptions());

    if (
      process.env.NODE_ENV !== "production" &&
      typeof process.env.DEBUG === "string" &&
      /auth|next-auth/.test(process.env.DEBUG)
    ) {
      return async (req: Request) => {
        const attempted = new URL(req.url).searchParams.get("redirect_uri");
        if (attempted) {
          console.debug(`[auth] incoming redirect_uri=${attempted}`);
        }

        return nextAuthHandler(req);
      };
    }

    return nextAuthHandler;
  } catch (error) {
    console.error("[auth:init]", error);
    throw error;
  }
};

const handler = createHandler();

export const GET = handler;
export const POST = handler;
export const handlers = { GET: handler, POST: handler } as const;
