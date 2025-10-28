import type { AuthConfig } from "next-auth";
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
  NEXTAUTH_SECRET: cleanEnvValue(process.env.NEXTAUTH_SECRET),
  NEXTAUTH_URL: cleanEnvValue(process.env.NEXTAUTH_URL),
  AUTH_REDIRECT_PROXY_URL: cleanEnvValue(process.env.AUTH_REDIRECT_PROXY_URL),
} as const;

const resolveRedirectProxyUrl = () => {
  if (AUTH_ENV.AUTH_REDIRECT_PROXY_URL) {
    return {
      url: AUTH_ENV.AUTH_REDIRECT_PROXY_URL,
      source: "AUTH_REDIRECT_PROXY_URL" as const,
    };
  }

  if (AUTH_ENV.NEXTAUTH_URL) {
    try {
      return {
        url: new URL("/api/auth", AUTH_ENV.NEXTAUTH_URL).toString(),
        source: "NEXTAUTH_URL" as const,
      };
    } catch (error) {
      console.warn(
        "[auth] Failed to derive redirect proxy URL from NEXTAUTH_URL. Set AUTH_REDIRECT_PROXY_URL explicitly.",
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

export const REQUIRED_AUTH_ENV_KEYS = ["GITHUB_ID", "GITHUB_SECRET", "NEXTAUTH_SECRET"] as const;
export type AuthEnvKey = (typeof REQUIRED_AUTH_ENV_KEYS)[number];

export const getMissingAuthEnv = () => REQUIRED_AUTH_ENV_KEYS.filter((key) => !AUTH_ENV[key]);

export const getAuthEnvDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  nextAuthUrl: AUTH_ENV.NEXTAUTH_URL,
  redirectProxyUrl: REDIRECT_PROXY.url,
  redirectProxySource: REDIRECT_PROXY.source,
});

export const getRuntimeHost = (req: Request) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ?? "unknown";
};

const shouldLogRedirects = () =>
  process.env.NODE_ENV !== "production" &&
  typeof process.env.DEBUG === "string" &&
  /auth|next-auth/.test(process.env.DEBUG);

export const createAuthOptions = (): AuthConfig & {
  trustHost?: boolean;
  redirectProxyUrl?: string;
  basePath?: string;
} => {
  const logRedirects = shouldLogRedirects();

  return {
    secret: AUTH_ENV.NEXTAUTH_SECRET,
    providers: [
      GitHubProvider({
        clientId: AUTH_ENV.GITHUB_ID as string,
        clientSecret: AUTH_ENV.GITHUB_SECRET as string,
      }),
    ],
    pages: {
      error: "/auth/error",
    },
    basePath: "/api/auth",
    trustHost: true,
    redirectProxyUrl: REDIRECT_PROXY.url,
    callbacks: {
      async redirect({ url }) {
        if (logRedirects) {
          console.debug(`[auth] redirect -> ${url}`);
        }
        return url;
      },
    },
  };
};

export const authOptions = createAuthOptions();
