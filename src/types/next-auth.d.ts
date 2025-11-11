import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    googleIdToken?: string;
    googleAccessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    picture?: string;
    googleIdToken?: string;
    googleAccessToken?: string;
  }
}
