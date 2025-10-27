import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const FALLBACK_ENV = {
  GITHUB_ID: "Ov23liMbWH3KxtbeLdqT",
  GITHUB_SECRET: "9787e851ac01d58fa859152942e079f7322a76b7",
  NEXTAUTH_SECRET: "reQegr7kph5nyK82UJ9zZ5UnYU6SG/cf+UBaIioDXWs=",
  NEXTAUTH_URL: "https://oneline-one.vercel.app",
} as const;

type AuthEnvKey = keyof typeof FALLBACK_ENV;

const getEnvWithFallback = (key: AuthEnvKey) => {
  const rawValue = process.env[key];
  if (rawValue && rawValue.trim().length > 0) {
    return rawValue;
  }

  console.warn(`Missing NextAuth configuration for ${key}. Falling back to bundled default.`);
  return FALLBACK_ENV[key];
};

const resolvedAuthEnv = {
  GITHUB_ID: getEnvWithFallback("GITHUB_ID"),
  GITHUB_SECRET: getEnvWithFallback("GITHUB_SECRET"),
  NEXTAUTH_SECRET: getEnvWithFallback("NEXTAUTH_SECRET"),
};

const resolvedNextAuthUrl = (() => {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const formatted = vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    console.warn(`NEXTAUTH_URL not set. Falling back to inferred Vercel URL: ${formatted}.`);
    return formatted;
  }

  console.warn(`NEXTAUTH_URL not set. Falling back to bundled default: ${FALLBACK_ENV.NEXTAUTH_URL}.`);
  return FALLBACK_ENV.NEXTAUTH_URL;
})();

export const authOptions: NextAuthOptions = {
  secret: resolvedAuthEnv.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: resolvedAuthEnv.GITHUB_ID,
      clientSecret: resolvedAuthEnv.GITHUB_SECRET,
    }),
  ],
};

export const resolvedAuthConfig = { ...resolvedAuthEnv, NEXTAUTH_URL: resolvedNextAuthUrl };
