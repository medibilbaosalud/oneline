import { resolvedAuthConfig } from "@/lib/authOptions";

export function GET() {
  const vars = {
    GITHUB_ID: Boolean(resolvedAuthConfig.GITHUB_ID),
    GITHUB_SECRET: Boolean(resolvedAuthConfig.GITHUB_SECRET),
    NEXTAUTH_SECRET: Boolean(resolvedAuthConfig.NEXTAUTH_SECRET),
    NEXTAUTH_URL: resolvedAuthConfig.NEXTAUTH_URL,
  } as const;

  const ok = vars.GITHUB_ID && vars.GITHUB_SECRET && vars.NEXTAUTH_SECRET && Boolean(vars.NEXTAUTH_URL);

  return new Response(
    JSON.stringify({
      ok,
      vars: {
        GITHUB_ID: vars.GITHUB_ID,
        GITHUB_SECRET: vars.GITHUB_SECRET,
        NEXTAUTH_SECRET: vars.NEXTAUTH_SECRET,
        NEXTAUTH_URL: vars.NEXTAUTH_URL,
      },
    }),
    {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
      status: ok ? 200 : 500,
    },
  );
}
