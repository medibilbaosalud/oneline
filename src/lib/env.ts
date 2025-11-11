const fallback = <T extends string | undefined>(...values: T[]): string => {
  for (const value of values) {
    if (value && value.length > 0) return value;
  }
  return '';
};

export const ORIGIN =
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export const env = {
  GOOGLE_ID: fallback(
    process.env.AUTH_GOOGLE_ID,
    process.env.GOOGLE_CLIENT_ID,
    process.env.NEXT_PUBLIC_GOOGLE_ID,
    process.env.GOOGLE_ID,
  ),
  GOOGLE_SECRET: fallback(
    process.env.AUTH_GOOGLE_SECRET,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_SECRET,
    process.env.GOOGLE_SECRET,
  ),
  NEXTAUTH_SECRET: fallback(process.env.NEXTAUTH_SECRET, process.env.AUTH_SECRET),
  ORIGIN,
};

if (typeof window === 'undefined') {
  if (!process.env.NEXTAUTH_URL && ORIGIN) {
    process.env.NEXTAUTH_URL = ORIGIN;
  }

  const missing: string[] = [];
  if (!env.GOOGLE_ID) missing.push('GOOGLE_ID');
  if (!env.GOOGLE_SECRET) missing.push('GOOGLE_SECRET');
  if (!env.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET');
  if (missing.length > 0) {
    console.warn(`[auth] Missing env vars: ${missing.join(', ')}`);
  }
}
