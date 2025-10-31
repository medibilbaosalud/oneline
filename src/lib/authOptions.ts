import GitHub from "next-auth/providers/github";

const readEnv = (key: string) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

export type RequiredAuthEnvKey = "GITHUB_ID" | "GITHUB_SECRET" | "NEXTAUTH_SECRET";

const resolveRedirectProxyUrl = () => {
  const explicit = readEnv("AUTH_REDIRECT_PROXY_URL");
  if (explicit) return explicit;

  const canonicalHost = readEnv("AUTH_URL") ?? readEnv("NEXTAUTH_URL");
  if (!canonicalHost) return undefined;

  try {
    return new URL("/api/auth", canonicalHost).toString();
  } catch {
    return undefined;
  }
};

export const getAuthDiagnostics = () => {
  const missing: RequiredAuthEnvKey[] = [];

  if (!readEnv("GITHUB_ID")) missing.push("GITHUB_ID");
  if (!readEnv("GITHUB_SECRET")) missing.push("GITHUB_SECRET");
  if (!readEnv("NEXTAUTH_SECRET") && !readEnv("AUTH_SECRET")) {
    missing.push("NEXTAUTH_SECRET");
  }

  return {
    missing,
    redirectProxyUrl: resolveRedirectProxyUrl() ?? null,
  };
};

export const createAuthOptions = () => {
  const redirectProxyUrl = resolveRedirectProxyUrl();

  return {
    secret: readEnv("NEXTAUTH_SECRET") ?? readEnv("AUTH_SECRET"),
    providers: [
      GitHub({
        clientId: readEnv("GITHUB_ID")!,
        clientSecret: readEnv("GITHUB_SECRET")!,
      }),
    ],
    trustHost: true,
    ...(redirectProxyUrl ? { redirectProxyUrl } : {}),
  };
};

export const getRuntimeHost = (req: Request) =>
  req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "unknown";
