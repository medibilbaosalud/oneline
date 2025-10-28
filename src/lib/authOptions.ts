import GitHubProvider from "next-auth/providers/github";

type RequiredAuthEnvKey = "GITHUB_ID" | "GITHUB_SECRET" | "NEXTAUTH_SECRET";

type NullableEnv = string | undefined | null;

const cleanEnvValue = (value: NullableEnv) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const env = {
  GITHUB_ID: cleanEnvValue(process.env.GITHUB_ID),
  GITHUB_SECRET: cleanEnvValue(process.env.GITHUB_SECRET),
  NEXTAUTH_SECRET: cleanEnvValue(process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET),
  AUTH_REDIRECT_PROXY_URL: cleanEnvValue(process.env.AUTH_REDIRECT_PROXY_URL),
  NEXTAUTH_URL: cleanEnvValue(process.env.NEXTAUTH_URL ?? process.env.AUTH_URL),
} as const;

const deriveRedirectProxyUrl = () => {
  if (env.AUTH_REDIRECT_PROXY_URL) {
    return { url: env.AUTH_REDIRECT_PROXY_URL, source: "AUTH_REDIRECT_PROXY_URL" as const };
  }

  if (env.NEXTAUTH_URL) {
    try {
      return {
        url: new URL("/api/auth", env.NEXTAUTH_URL).toString(),
        source: "NEXTAUTH_URL" as const,
      };
    } catch (error) {
      console.warn("[auth] Failed to derive redirect proxy URL", error);
    }
  }

  return { url: undefined, source: null as const };
};

const redirectProxy = deriveRedirectProxyUrl();

export const getMissingAuthEnv = () => {
  const missing: RequiredAuthEnvKey[] = [];
  if (!env.GITHUB_ID) missing.push("GITHUB_ID");
  if (!env.GITHUB_SECRET) missing.push("GITHUB_SECRET");
  if (!env.NEXTAUTH_SECRET) missing.push("NEXTAUTH_SECRET");
  return missing;
};

export const getAuthDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  redirectProxyUrl: redirectProxy.url,
  redirectProxySource: redirectProxy.source,
  nextAuthUrl: env.NEXTAUTH_URL,
});

export const getRuntimeHost = (req: Request) =>
  req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "unknown";

export const createAuthConfig = () => {
  const missing = getMissingAuthEnv();
  if (missing.length > 0) {
    throw new Error(`Missing NextAuth env vars: ${missing.join(", ")}`);
  }

  return {
    secret: env.NEXTAUTH_SECRET,
    providers: [
      GitHubProvider({
        clientId: env.GITHUB_ID as string,
        clientSecret: env.GITHUB_SECRET as string,
      }),
    ],
    trustHost: true,
    basePath: "/api/auth",
    callbacks: {
      async redirect({ url }: { url: string }) {
        return url;
      },
    },
    ...(redirectProxy.url ? { redirectProxyUrl: redirectProxy.url } : {}),
    pages: {
      error: "/auth/error",
    },
  };
};
