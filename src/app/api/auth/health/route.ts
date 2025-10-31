import { getAuthDiagnostics, getRuntimeHost } from "@/lib/authOptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const diagnostics = getAuthDiagnostics();
  const runtimeHost = getRuntimeHost(req);
  const redirectAttempt = new URL(req.url).searchParams.get("redirect_uri") ?? undefined;

  const ok = diagnostics.missing.length === 0;

  return new Response(
    JSON.stringify({
      ok,
      missing: diagnostics.missing,
      runtimeHost,
      redirectAttempt,
      redirectProxyUrl: diagnostics.redirectProxyUrl,
      hint: ok
        ? "GitHub login is configured"
        : "Add redirect_uri to GitHub OAuth App or set AUTH_REDIRECT_PROXY_URL in Vercel",
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      status: ok ? 200 : 503,
    },
  );
}
