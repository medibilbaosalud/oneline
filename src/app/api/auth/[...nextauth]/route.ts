import NextAuth from "next-auth";

import { createAuthOptions, getMissingAuthEnv } from "@/lib/authOptions";

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

const missingEnvResponse = missingEnv.length > 0 ? respondWithMissingEnv : null;

const { handlers: upstreamHandlers, auth, signIn, signOut } =
  missingEnvResponse === null
    ? NextAuth(createAuthOptions())
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

  if (
    process.env.NODE_ENV !== "production" &&
    typeof process.env.DEBUG === "string" &&
    /auth|next-auth/.test(process.env.DEBUG)
  ) {
    const attempted = new URL(req.url).searchParams.get("redirect_uri");
    if (attempted) {
      console.debug(`[auth] incoming redirect_uri=${attempted}`);
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
