export type RequiredAuthEnvKey = "GITHUB_ID" | "GITHUB_SECRET" | "NEXTAUTH_SECRET";

const CANONICAL_HOST = "https://oneline-one.vercel.app";

const cleanEnvValue = (value?: string | null) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const requiredEnvKeys: RequiredAuthEnvKey[] = ["GITHUB_ID", "GITHUB_SECRET", "NEXTAUTH_SECRET"];

const env = {
  GITHUB_ID: cleanEnvValue(process.env.GITHUB_ID),
  GITHUB_SECRET: cleanEnvValue(process.env.GITHUB_SECRET),
  NEXTAUTH_SECRET: cleanEnvValue(process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET),
  AUTH_REDIRECT_PROXY_URL: cleanEnvValue(process.env.AUTH_REDIRECT_PROXY_URL),
  NEXTAUTH_URL: cleanEnvValue(process.env.NEXTAUTH_URL ?? process.env.AUTH_URL),
} as const;

export const getMissingAuthEnv = (): RequiredAuthEnvKey[] =>
  requiredEnvKeys.filter((key) => !env[key]);

type RedirectProxySource =
  | "AUTH_REDIRECT_PROXY_URL"
  | "NEXTAUTH_URL"
  | "FALLBACK_CANONICAL"
  | null;

type RedirectProxy = {
  url: string | undefined;
  source: RedirectProxySource;
};

export const resolveRedirectProxy = (): RedirectProxy => {
  if (env.AUTH_REDIRECT_PROXY_URL) {
    return { url: env.AUTH_REDIRECT_PROXY_URL, source: "AUTH_REDIRECT_PROXY_URL" };
  }

  if (env.NEXTAUTH_URL) {
    try {
      return {
        url: new URL("/api/auth", env.NEXTAUTH_URL).toString(),
        source: "NEXTAUTH_URL",
      };
    } catch (error) {
      console.warn("[auth] Failed to derive redirect proxy URL", error);
    }
  }

  return { url: `${CANONICAL_HOST}/api/auth`, source: "FALLBACK_CANONICAL" };
};

export const getAuthDiagnostics = () => {
  const redirectProxy = resolveRedirectProxy();

  return {
    missing: getMissingAuthEnv(),
    redirectProxyUrl: redirectProxy.url,
    redirectProxySource: redirectProxy.source,
    nextAuthUrl: env.NEXTAUTH_URL ?? CANONICAL_HOST,
  };
};

export const getRuntimeHost = (req: Request) =>
  req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "unknown";
