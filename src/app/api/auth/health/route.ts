import { getAuthEnvDiagnostics, getRuntimeHost } from "@/lib/authOptions";

export function GET(req: Request) {
  const diagnostics = getAuthEnvDiagnostics();
  const runtimeHost = getRuntimeHost(req);
  const redirectAttempt = new URL(req.url).searchParams.get("redirect_uri") ?? undefined;

  const body = {
    ok: diagnostics.missing.length === 0,
    missing: diagnostics.missing,
    runtimeHost,
    redirectAttempt,
    hint: "Add redirect_uri to GitHub OAuth App or set NEXTAUTH_URL in Vercel.",
  } as const;

  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    status: body.ok ? 200 : 503,
  });
}
