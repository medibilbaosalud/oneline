import GitHub from "next-auth/providers/github";

export type RequiredAuthEnvKey = "GITHUB_ID" | "GITHUB_SECRET" | "NEXTAUTH_SECRET";

const REQUIRED_ENV_KEYS: RequiredAuthEnvKey[] = [
  "GITHUB_ID",
  "GITHUB_SECRET",
  "NEXTAUTH_SECRET",
];

const getEnv = (key: string) => {
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
};

const deriveRedirectProxyUrl = () => {
  const explicit = getEnv("AUTH_REDIRECT_PROXY_URL");
  if (explicit) return explicit;

  const canonical = getEnv("AUTH_URL") ?? getEnv("NEXTAUTH_URL");
  if (!canonical) return undefined;

  try {
    return new URL("/api/auth", canonical).toString();
  } catch {
    return undefined;
  }
};

export const getMissingAuthEnv = (): RequiredAuthEnvKey[] =>
  REQUIRED_ENV_KEYS.filter((key) => !getEnv(key));

export const createAuthConfig = () => {
  const redirectProxyUrl = deriveRedirectProxyUrl();

  return {
    secret: getEnv("NEXTAUTH_SECRET") ?? getEnv("AUTH_SECRET"),
    providers: [
      GitHub({
        clientId: getEnv("GITHUB_ID")!,
        clientSecret: getEnv("GITHUB_SECRET")!,
      }),
    ],
    trustHost: true,
    ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  };
};

export const getAuthDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  redirectProxyUrl: deriveRedirectProxyUrl() ?? null,
});

export const getRuntimeHost = (req: Request) =>
  req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "unknown";
