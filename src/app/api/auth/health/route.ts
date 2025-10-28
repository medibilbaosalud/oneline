import { getAuthEnvDiagnostics, getRuntimeHost } from "@/lib/authOptions";

export function GET(req: Request) {
  const diagnostics = getAuthEnvDiagnostics();
  const runtimeHost = getRuntimeHost(req);
  const redirectAttempt = new URL(req.url).searchParams.get("redirect_uri") ?? undefined;

  const ok = diagnostics.missing.length === 0;

  const body = {
    ok,
    missing: diagnostics.missing,
    runtimeHost,
    redirectAttempt,
    redirectProxyUrl: diagnostics.redirectProxyUrl ?? null,
    redirectProxySource: diagnostics.redirectProxySource ?? null,
    authUrl: diagnostics.authUrl,
    nextauthUrl: diagnostics.nextAuthUrl,
    secretSource: diagnostics.secretSource,
    hint: ok
      ? undefined
      : "Add the missing env vars in Vercel. For previews set AUTH_REDIRECT_PROXY_URL to your production /api/auth endpoint.",
  } as const;

  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    status: ok ? 200 : 503,
  });
}
