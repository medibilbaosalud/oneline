import NextAuth from "next-auth";
import {
  authOptions,
  getMissingAuthEnv,
  getRuntimeHost,
  resolveCanonicalOrigin,
} from "@/lib/authOptions";

const nextAuthHandler = NextAuth(authOptions);

const respondWithMissingEnv = (missing: string[]) =>
  new Response(
    JSON.stringify({
      ok: false,
      message:
        "NextAuth is not configured. Add the missing environment variables and redeploy.",
      missing,
      docs:
        "https://next-auth.js.org/configuration/options#nextauth_secret",
    }),
    {
      status: 503,
      headers: {
        "content-type": "application/json",
      },
    },
  );

const respondWithRedirectMismatch = (
  redirectUri: string,
  canonicalOrigin: string,
  runtimeHost: string,
) =>
  new Response(
    JSON.stringify({
      ok: false,
      message: "GitHub redirected to an unregistered URL.",
      redirectUri,
      canonicalOrigin,
      runtimeHost,
      hint:
        "Add redirectUri as an Authorization callback URL in GitHub or set NEXTAUTH_URL to your canonical domain.",
    }),
    {
      status: 422,
      headers: {
        "content-type": "application/json",
      },
    },
  );

async function handleAuthRequest(req: Request) {
  const missing = getMissingAuthEnv();
  if (missing.length > 0) {
    return respondWithMissingEnv(missing);
  }

  const url = new URL(req.url);
  const redirectUri = url.searchParams.get("redirect_uri");
  const canonicalOrigin = resolveCanonicalOrigin(req);
  const runtimeHost = getRuntimeHost(req);

  if (redirectUri && canonicalOrigin && !redirectUri.startsWith(canonicalOrigin)) {
    console.error(
      `[auth] Redirect mismatch detected. redirect_uri=${redirectUri} canonicalOrigin=${canonicalOrigin} runtimeHost=${runtimeHost}`,
    );
    return respondWithRedirectMismatch(redirectUri, canonicalOrigin, runtimeHost);
  }

  return nextAuthHandler(req);
}

export function GET(req: Request) {
  return handleAuthRequest(req);
}

export function POST(req: Request) {
  return handleAuthRequest(req);
}
