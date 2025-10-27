export function GET() {
  const vars = {
    GITHUB_ID: Boolean(process.env.GITHUB_ID),
    GITHUB_SECRET: Boolean(process.env.GITHUB_SECRET),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
  } as const;

  const ok = vars.GITHUB_ID && vars.GITHUB_SECRET && vars.NEXTAUTH_SECRET && vars.NEXTAUTH_URL !== "MISSING";

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
