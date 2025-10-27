import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const FALLBACK_ENV = {
  GITHUB_ID: "Ov23liMbWH3KxtbeLdqT",
  GITHUB_SECRET: "9787e851ac01d58fa859152942e079f7322a76b7",
  NEXTAUTH_SECRET: "reQegr7kph5nyK82UJ9zZ5UnYU6SG/cf+UBaIioDXWs=",
  NEXTAUTH_URL: "https://oneline-one.vercel.app",
} as const;

const resolvedAuthEnv = {
  GITHUB_ID: process.env.GITHUB_ID ?? FALLBACK_ENV.GITHUB_ID,
  GITHUB_SECRET: process.env.GITHUB_SECRET ?? FALLBACK_ENV.GITHUB_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? FALLBACK_ENV.NEXTAUTH_SECRET,
};

const resolvedNextAuthUrl = process.env.NEXTAUTH_URL ?? FALLBACK_ENV.NEXTAUTH_URL;

const missingKeys = Object.entries(resolvedAuthEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(
    `Missing NextAuth configuration: ${missingKeys.join(", ")}. GitHub login will fall back to built-in defaults.`,
  );
}

if (!process.env.NEXTAUTH_URL) {
  console.warn(
    `NEXTAUTH_URL is not set. Falling back to ${FALLBACK_ENV.NEXTAUTH_URL}.`,
  );
}

export const authOptions: NextAuthOptions = {
  secret: resolvedAuthEnv.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: resolvedAuthEnv.GITHUB_ID,
      clientSecret: resolvedAuthEnv.GITHUB_SECRET,
    }),
  ],
};

export const missingAuthEnv = missingKeys;
export const resolvedAuthConfig = { ...resolvedAuthEnv, NEXTAUTH_URL: resolvedNextAuthUrl };
