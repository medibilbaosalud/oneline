import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { env } from '@/lib/env';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_ID,
      clientSecret: env.GOOGLE_SECRET,
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth' },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile) {
        token.picture = (profile as any)?.picture ?? token.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user)
        (session.user as any).image = (token as any)?.picture ?? session.user.image;
      return session;
    },
    async redirect({ url, baseUrl }) {
      const base = env.ORIGIN || baseUrl;
      if (url.startsWith('/')) url = `${base}${url}`;
      try {
        const u = new URL(url);
        if (u.origin !== base) return `${base}/`;
        if (u.pathname === '/auth' || u.pathname === '/api/auth/signin') return `${base}/`;
        return u.toString();
      } catch {
        return `${base}/`;
      }
    },
  },
  ...(process.env.NODE_ENV === 'production'
    ? {
        cookies: {
          sessionToken: {
            name: '__Secure-next-auth.session-token',
            options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
          },
        },
      }
    : {}),
});

export { handler as GET, handler as POST };
