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
};

export const REQUIRED_AUTH_ENV_KEYS = ["GITHUB_ID", "GITHUB_SECRET", "NEXTAUTH_SECRET"] as const;
export type AuthEnvKey = (typeof REQUIRED_AUTH_ENV_KEYS)[number];

export const getMissingAuthEnv = () => REQUIRED_AUTH_ENV_KEYS.filter((key) => !AUTH_ENV[key]);

export const getAuthEnvDiagnostics = () => ({
  missing: getMissingAuthEnv(),
  nextAuthUrl: AUTH_ENV.NEXTAUTH_URL,
});

export const getRuntimeHost = (req: Request) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return host ?? "unknown";
};

export const resolveCanonicalOrigin = (req?: Request) => {
  if (AUTH_ENV.NEXTAUTH_URL) {
    try {
      return new URL(AUTH_ENV.NEXTAUTH_URL).origin;
    } catch (error) {
      console.error(`NEXTAUTH_URL is not a valid URL: ${AUTH_ENV.NEXTAUTH_URL}`, error);
    }
  }

  if (!req) {
    return undefined;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) {
    return undefined;
  }

  const proto = req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
};

export const authOptions: NextAuthOptions = {
  secret: AUTH_ENV.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: AUTH_ENV.GITHUB_ID ?? "",
      clientSecret: AUTH_ENV.GITHUB_SECRET ?? "",
    }),
  ],
  pages: {
    error: "/auth/error",
  },
};
