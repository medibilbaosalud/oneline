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

export const getAuthBaseUrl = () => AUTH_ENV.AUTH_REDIRECT_PROXY_URL ?? AUTH_ENV.NEXTAUTH_URL;

export const getAuthEnvDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  nextAuthUrl: AUTH_ENV.NEXTAUTH_URL,
  redirectProxyUrl: AUTH_ENV.AUTH_REDIRECT_PROXY_URL,
});

export const getRuntimeHost = (req: Request) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ?? "unknown";
};

type ExtendedAuthOptions = NextAuthOptions & {
  trustHost?: boolean;
  redirectProxyUrl?: string;
  basePath?: string;
};

const shouldLogRedirects = () =>
  process.env.NODE_ENV !== "production" &&
  typeof process.env.DEBUG === "string" &&
  /auth|next-auth/.test(process.env.DEBUG);

const toAbsoluteUrl = (url: string, fallbackBase: string) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const normalizedBase = fallbackBase.replace(/\/$/, "");
  if (url.startsWith("/")) {
    return `${normalizedBase}${url}`;
  }
  return `${normalizedBase}/${url}`;
};

export const createAuthOptions = (baseUrl?: string): ExtendedAuthOptions => {
  const fallbackBase = baseUrl ?? AUTH_ENV.NEXTAUTH_URL;

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
    redirectProxyUrl: AUTH_ENV.AUTH_REDIRECT_PROXY_URL,
    callbacks: {
      async redirect({ url, baseUrl: defaultBase }) {
        const effectiveBase = fallbackBase ?? defaultBase;
        const finalUrl = effectiveBase ? toAbsoluteUrl(url, effectiveBase) : url;

        if (shouldLogRedirects()) {
          console.debug(`[auth] redirect -> ${finalUrl}`);
        }

        return finalUrl;
      },
    },
  };
};

export const authOptions = createAuthOptions(getAuthBaseUrl());
