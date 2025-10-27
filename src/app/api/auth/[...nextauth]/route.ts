import NextAuth from "next-auth";

import { authOptions, getMissingAuthEnv } from "@/lib/authOptions";

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

const nextAuthHandler = missingEnv.length === 0 ? NextAuth(authOptions) : null;

const handler = (req: Request) =>
  nextAuthHandler ? nextAuthHandler(req) : respondWithMissingEnv();

export const GET = handler;
export const POST = handler;
