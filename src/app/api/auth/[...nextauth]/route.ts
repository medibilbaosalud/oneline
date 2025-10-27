import NextAuth from "next-auth";

import {
  authOptions,
  getMissingAuthEnv,
  resolveCanonicalOrigin,
} from "@/lib/authOptions";

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

const nextAuthHandler =
  missingEnv.length === 0
    ? NextAuth({
        ...authOptions,
      })
    : null;

const handler = (req: Request) => {
  if (!nextAuthHandler) {
    return respondWithMissingEnv();
  }

  const url = new URL(req.url);
  const runtimeOrigin = `${url.protocol}//${url.host}`;
  const canonicalOrigin = resolveCanonicalOrigin(req);

  const isSignInRequest = url.pathname.endsWith("/signin") ||
    url.pathname.endsWith("/signin/github");

  if (
    isSignInRequest &&
    canonicalOrigin &&
    runtimeOrigin !== canonicalOrigin
  ) {
    const redirectUri = `${runtimeOrigin}/api/auth/callback/github`;
    console.warn(
      "[auth] GitHub redirect mismatch detected",
      JSON.stringify({ runtimeOrigin, canonicalOrigin, redirectUri })
    );

    const searchParams = new URLSearchParams({
      error: "redirect_mismatch",
      redirect_uri: redirectUri,
      expected: canonicalOrigin,
    });

    return Response.redirect(`${runtimeOrigin}/auth/error?${searchParams.toString()}`, 302);
  }

  return nextAuthHandler(req);
};

export { handler as GET, handler as POST };
