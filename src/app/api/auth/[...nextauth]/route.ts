import NextAuth from "next-auth";

import { createAuthOptions, getAuthBaseUrl, getMissingAuthEnv } from "@/lib/authOptions";

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

const respondWithRedirectMismatch = (attempted: string) =>
  new Response(
    JSON.stringify({
      error: "redirect_mismatch",
      attempted,
      hint:
        "Copy this URL into your GitHub OAuth App Authorization callback URLs or set NEXTAUTH_URL to your canonical domain in Vercel and redeploy.",
    }),
    {
      status: 422,
      headers: {
        "content-type": "application/json",
      },
    },
  );

const missingEnvResponse = missingEnv.length > 0 ? respondWithMissingEnv : null;

const baseUrl = getAuthBaseUrl();

let canonicalHost: string | null = null;

if (baseUrl) {
  try {
    canonicalHost = new URL(baseUrl).host;
  } catch (error) {
    console.warn(`[auth] invalid AUTH_REDIRECT_PROXY_URL/NEXTAUTH_URL value: ${baseUrl}`, error);
  }
}

const { handlers: upstreamHandlers, auth, signIn, signOut } =
  missingEnvResponse === null
    ? NextAuth(createAuthOptions(baseUrl))
    : {
        handlers: {
          GET: () => respondWithMissingEnv(),
          POST: () => respondWithMissingEnv(),
        },
        auth: async () => null,
        signIn: async () => {
          throw new Error("NextAuth env vars are missing");
        },
        signOut: async () => {
          throw new Error("NextAuth env vars are missing");
        },
      };

const handler: (req: Request) => Promise<Response> | Response = async (req) => {
  if (missingEnvResponse) {
    return missingEnvResponse();
  }

  if (canonicalHost) {
    const url = new URL(req.url);
    const attempted = url.searchParams.get("redirect_uri");

    if (attempted) {
      try {
        const attemptedHost = new URL(attempted).host;

        if (attemptedHost !== canonicalHost) {
          if (process.env.NODE_ENV !== "production") {
            console.debug(`[auth] redirect mismatch for ${attempted}`);
          }

          return respondWithRedirectMismatch(attempted);
        }
      } catch (error) {
        console.warn(`[auth] invalid redirect_uri received: ${attempted}`, error);
      }
    }

    if (
      process.env.NODE_ENV !== "production" &&
      typeof process.env.DEBUG === "string" &&
      /auth|next-auth/.test(process.env.DEBUG) &&
      req.url.includes("/signin/github")
    ) {
      console.debug(`[auth] signin request host=${canonicalHost}`);
    }
  }

  const method = req.method as "GET" | "POST";
  const handlerFn = upstreamHandlers[method];

  if (!handlerFn) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  return handlerFn(req);
};

export { auth, signIn, signOut };
export const handlers = { GET: handler, POST: handler } as const;
export const GET = handler;
export const POST = handler;
