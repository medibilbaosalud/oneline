import GitHubProvider from "next-auth/providers/github";

const cleanEnvValue = (value?: string | null) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const AUTH_ENV = {
  GITHUB_ID: cleanEnvValue(process.env.GITHUB_ID),
  GITHUB_SECRET: cleanEnvValue(process.env.GITHUB_SECRET),
  AUTH_SECRET: cleanEnvValue(process.env.AUTH_SECRET),
  NEXTAUTH_SECRET: cleanEnvValue(process.env.NEXTAUTH_SECRET),
  AUTH_URL: cleanEnvValue(process.env.AUTH_URL),
  NEXTAUTH_URL: cleanEnvValue(process.env.NEXTAUTH_URL),
  AUTH_REDIRECT_PROXY_URL: cleanEnvValue(process.env.AUTH_REDIRECT_PROXY_URL),
} as const;

const resolveSecret = () => AUTH_ENV.AUTH_SECRET ?? AUTH_ENV.NEXTAUTH_SECRET;

const resolveBaseAuthUrl = () => AUTH_ENV.AUTH_URL ?? AUTH_ENV.NEXTAUTH_URL;

const resolveRedirectProxyUrl = () => {
  if (AUTH_ENV.AUTH_REDIRECT_PROXY_URL) {
    return {
      url: AUTH_ENV.AUTH_REDIRECT_PROXY_URL,
      source: "AUTH_REDIRECT_PROXY_URL" as const,
    };
  }

  const baseAuthUrl = resolveBaseAuthUrl();
  if (baseAuthUrl) {
    try {
      return {
        url: new URL("/api/auth", baseAuthUrl).toString(),
        source: AUTH_ENV.AUTH_URL ? "AUTH_URL" : "NEXTAUTH_URL",
      } as const;
    } catch (error) {
      console.warn(
        "[auth] Failed to derive redirect proxy URL from configured auth URL. Set AUTH_REDIRECT_PROXY_URL explicitly.",
        error,
      );
    }
  }

  return {
    url: undefined,
    source: null,
  } as const;
};

const REDIRECT_PROXY = resolveRedirectProxyUrl();

export const resolveAuthRedirectProxy = () => REDIRECT_PROXY;

const REQUIRED_AUTH_ENV_KEYS = ["GITHUB_ID", "GITHUB_SECRET"] as const;

export type AuthEnvKey = (typeof REQUIRED_AUTH_ENV_KEYS)[number] | "AUTH_SECRET" | "NEXTAUTH_SECRET";

export const getMissingAuthEnv = () => {
  const missing = new Set<AuthEnvKey>();

  for (const key of REQUIRED_AUTH_ENV_KEYS) {
    if (!AUTH_ENV[key]) {
      missing.add(key);
    }
  }

  if (!resolveSecret()) {
    missing.add("AUTH_SECRET");
    missing.add("NEXTAUTH_SECRET");
  }

  return Array.from(missing);
};

export const getAuthEnvDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  authUrl: AUTH_ENV.AUTH_URL ?? null,
  nextAuthUrl: AUTH_ENV.NEXTAUTH_URL ?? null,
  redirectProxyUrl: REDIRECT_PROXY.url,
  redirectProxySource: REDIRECT_PROXY.source,
  secretSource: AUTH_ENV.AUTH_SECRET ? "AUTH_SECRET" : AUTH_ENV.NEXTAUTH_SECRET ? "NEXTAUTH_SECRET" : null,
});

export const getRuntimeHost = (req: Request) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ?? "unknown";
};

export const createAuthConfig = () => {
  const redirectProxyUrl = REDIRECT_PROXY.url;

  return {
    secret: resolveSecret(),
    providers: [
      GitHubProvider({
        clientId: AUTH_ENV.GITHUB_ID as string,
        clientSecret: AUTH_ENV.GITHUB_SECRET as string,
      }),
    ],
    pages: {
      error: "/auth/error",
    },
    trustHost: true,
    ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  };
};
