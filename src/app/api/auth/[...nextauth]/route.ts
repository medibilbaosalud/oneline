import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
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
  secret: env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google') {
        const enrichedToken = token as JWT & {
          googleIdToken?: string;
          googleAccessToken?: string;
        };
        const profilePicture = (profile as any)?.picture;
        if (typeof profilePicture === 'string' && profilePicture.length > 0) {
          enrichedToken.picture = profilePicture;
        }
        if (account.id_token) {
          enrichedToken.googleIdToken = account.id_token;
        }
        if (account.access_token) {
          enrichedToken.googleAccessToken = account.access_token;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const enrichedToken = token as JWT & {
        googleIdToken?: string;
        googleAccessToken?: string;
      };
      if (session.user) {
        const picture =
          (typeof enrichedToken.picture === 'string' && enrichedToken.picture.length > 0
            ? enrichedToken.picture
            : undefined) ??
          (typeof session.user.image === 'string' && session.user.image.length > 0
            ? session.user.image
            : undefined);
        (session.user as typeof session.user & { image?: string }).image = picture;
      }
      const enrichedSession = session as Session & {
        googleIdToken?: string;
        googleAccessToken?: string;
      };
      if (enrichedToken.googleIdToken) {
        enrichedSession.googleIdToken = enrichedToken.googleIdToken;
      }
      if (enrichedToken.googleAccessToken) {
        enrichedSession.googleAccessToken = enrichedToken.googleAccessToken;
      }
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
