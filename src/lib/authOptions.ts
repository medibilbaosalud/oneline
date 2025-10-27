import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

const requiredEnv = {
  GITHUB_ID: process.env.GITHUB_ID,
  GITHUB_SECRET: process.env.GITHUB_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
};

const missingKeys = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.warn(
    `Missing NextAuth configuration: ${missingKeys.join(", ")}. GitHub login will be disabled until these environment variables are provided.`,
  );
}

if (!process.env.NEXTAUTH_URL) {
  console.warn(
    "NEXTAUTH_URL is not set. NextAuth will rely on the Host header. Configure NEXTAUTH_URL to silence this warning.",
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GitHubProvider({
      clientId: (process.env.GITHUB_ID ?? "") as string,
      clientSecret: (process.env.GITHUB_SECRET ?? "") as string,
    }),
  ],
};

export const missingAuthEnv = missingKeys;
