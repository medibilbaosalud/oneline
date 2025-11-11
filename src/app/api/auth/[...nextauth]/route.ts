export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import { env } from '@/lib/env';

const authOptions: NextAuthOptions & { trustHost: true } = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_ID,
      clientSecret: env.GOOGLE_SECRET,
      authorization: { params: { prompt: 'select_account' } },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/auth' },
  trustHost: true,
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
        picture?: unknown;
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
        if (picture) {
          (session.user as typeof session.user & { image?: string }).image = picture;
        }
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
      let u: URL;
      try {
        u = new URL(url);
      } catch {
        return `${base}/`;
      }
      if (u.origin !== base) return `${base}/`;
      if (u.pathname === '/auth' || u.pathname === '/api/auth/signin') return `${base}/`;
      return u.toString();
    },
  },
  debug: true,
  events: {
    error(error) {
      console.error('[next-auth:error]', error);
    },
    signIn(message) {
      console.log(
        '[next-auth:signIn]',
        message?.user?.email,
        message?.account?.provider
      );
    },
    session(message) {
      console.log('[next-auth:session]', !!message?.session?.user);
    },
  } as any,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
