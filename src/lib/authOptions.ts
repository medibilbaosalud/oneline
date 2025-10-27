import type { NextAuthOptions } from "next-auth";
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
};

export const REQUIRED_AUTH_ENV_KEYS = ["GITHUB_ID", "GITHUB_SECRET", "NEXTAUTH_SECRET"] as const;
export type AuthEnvKey = (typeof REQUIRED_AUTH_ENV_KEYS)[number];

export const getMissingAuthEnv = () => REQUIRED_AUTH_ENV_KEYS.filter((key) => !AUTH_ENV[key]);

export const getAuthEnvDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  nextAuthUrl: AUTH_ENV.NEXTAUTH_URL,
  redirectProxyUrl: AUTH_ENV.AUTH_REDIRECT_PROXY_URL,
});

export const getRuntimeHost = (req: Request) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ?? "unknown";
};

const shouldLogRedirects = () =>
  process.env.NODE_ENV !== "production" &&
  typeof process.env.DEBUG === "string" &&
  /auth|next-auth/.test(process.env.DEBUG);

export const createAuthOptions = (): NextAuthOptions & {
  trustHost?: boolean;
  redirectProxyUrl?: string;
  basePath?: string;
} => ({
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
  redirectProxyUrl: AUTH_ENV.AUTH_REDIRECT_PROXY_URL,
  callbacks: shouldLogRedirects()
    ? {
        async redirect({ url }) {
          console.debug(`[auth] redirect -> ${url}`);
          return url;
        },
      }
    : undefined,
});

export const authOptions = createAuthOptions();
