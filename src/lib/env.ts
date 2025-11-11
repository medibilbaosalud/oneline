export const ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const env = {
  GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? '',
  GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? '',
  ORIGIN,
};

if ((!env.GOOGLE_ID || !env.GOOGLE_SECRET || !env.NEXTAUTH_SECRET) && typeof window === 'undefined') {
  console.warn('[auth] Missing env vars: GOOGLE_ID/GOOGLE_SECRET/NEXTAUTH_SECRET');
}
