export const ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const env = {
  GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? '',
  GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? '',
  ORIGIN,
};
