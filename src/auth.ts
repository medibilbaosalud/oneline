import NextAuth from "next-auth";

import { createAuthOptions } from "@/lib/authOptions";

export const { handlers: { GET, POST }, auth, signIn, signOut } = NextAuth(
  createAuthOptions(),
);
