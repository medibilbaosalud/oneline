import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { env } from '@/lib/env';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_ID,
      clientSecret: env.GOOGLE_SECRET,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {},
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google' && profile) {
        token.picture = (profile as any)?.picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).image = token.picture as string;
      return session;
    },
  },
  secret: env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
