import NextAuth from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const requiredEnvKeys = ["GITHUB_ID", "GITHUB_SECRET", "NEXTAUTH_SECRET"] as const;

const readEnv = (key: (typeof requiredEnvKeys)[number]) => {
  const value = process.env[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const authEnv = {
  GITHUB_ID: readEnv("GITHUB_ID"),
  GITHUB_SECRET: readEnv("GITHUB_SECRET"),
  NEXTAUTH_SECRET: readEnv("NEXTAUTH_SECRET"),
};

const missingEnv = requiredEnvKeys.filter((key) => !authEnv[key]);

const nextAuthHandler =
  missingEnv.length === 0
    ? NextAuth({
        secret: authEnv.NEXTAUTH_SECRET,
        providers: [
          GitHubProvider({
            clientId: authEnv.GITHUB_ID!,
            clientSecret: authEnv.GITHUB_SECRET!,
          }),
        ],
        pages: {
          error: "/auth/error",
        },
      })
    : null;

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

const handler = (req: Request) => {
  if (!nextAuthHandler) {
    return respondWithMissingEnv();
  }

  return nextAuthHandler(req);
};

export { handler as GET, handler as POST };
