export const env = {
  GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? process.env.NEXT_PUBLIC_GOOGLE_ID ?? '',
  GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ?? '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
};

if (typeof window === 'undefined' && (!env.GOOGLE_ID || !env.GOOGLE_SECRET || !env.NEXTAUTH_SECRET)) {
  console.warn('[auth] Missing env vars: GOOGLE_ID/GOOGLE_SECRET/NEXTAUTH_SECRET');
}
