import GitHub from "next-auth/providers/github";

const readEnv = (key: string) => {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

export type RequiredAuthEnvKey = "GITHUB_ID" | "GITHUB_SECRET" | "NEXTAUTH_SECRET";

type RedirectProxy = {
  url: string | null;
};

const resolveRedirectProxyUrl = (): RedirectProxy => {
  const explicit = readEnv("AUTH_REDIRECT_PROXY_URL");
  if (explicit) {
    return { url: explicit };
  }

  const canonicalHost = readEnv("AUTH_URL") ?? readEnv("NEXTAUTH_URL");
  if (!canonicalHost) {
    return { url: null };
  }

  try {
    return { url: new URL("/api/auth", canonicalHost).toString() };
  } catch (error) {
    console.error("[auth] Failed to derive redirect proxy URL", error);
    return { url: null };
  }
};

export const getAuthDiagnostics = () => {
  const missing: RequiredAuthEnvKey[] = [];

  if (!readEnv("GITHUB_ID")) missing.push("GITHUB_ID");
  if (!readEnv("GITHUB_SECRET")) missing.push("GITHUB_SECRET");
  if (!readEnv("NEXTAUTH_SECRET") && !readEnv("AUTH_SECRET")) {
    missing.push("NEXTAUTH_SECRET");
  }

  const proxy = resolveRedirectProxyUrl();

  return {
    missing,
    redirectProxyUrl: proxy.url,
  };
};

export const createAuthOptions = () => {
  const diagnostics = getAuthDiagnostics();
  if (diagnostics.missing.length > 0) {
    console.error(
      "[auth] Missing NextAuth environment variables:",
      diagnostics.missing.join(", "),
    );
    throw new Error(
      `Missing NextAuth env vars: ${diagnostics.missing.join(", ") || "unknown"}`,
    );
  }

  const secret = readEnv("NEXTAUTH_SECRET") ?? readEnv("AUTH_SECRET");
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET (or AUTH_SECRET) environment variable");
  }

  const config = {
    secret,
    providers: [
      GitHub({
        clientId: readEnv("GITHUB_ID")!,
        clientSecret: readEnv("GITHUB_SECRET")!,
      }),
    ],
    trustHost: true,
    session: { strategy: "jwt" as const },
  };

  return diagnostics.redirectProxyUrl
    ? { ...config, redirectProxyUrl: diagnostics.redirectProxyUrl }
    : config;
};

export const getRuntimeHost = (req: Request) =>
  req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "unknown";
