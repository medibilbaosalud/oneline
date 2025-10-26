"use client";

import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-white/70 backdrop-blur"
        disabled
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/50" />
        Checking session…
      </button>
    );
  }

  if (status !== "authenticated") {
    return (
      <button
        onClick={() => signIn("github")}
        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-lg shadow-indigo-500/20 transition hover:-translate-y-px hover:shadow-xl hover:shadow-indigo-500/30"
      >
        <span className="text-lg">🐙</span>
        Sign in with GitHub
      </button>
    );
  }

  const email = session.user?.email ?? session.user?.name ?? "Signed in";

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 backdrop-blur">
      {session.user?.image ? (
        <Image
          src={session.user.image}
          alt="GitHub avatar"
          width={28}
          height={28}
          className="rounded-full"
        />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs text-white/80">
          {email.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="max-w-[10rem] truncate text-xs font-medium uppercase tracking-wide text-white/70 sm:text-sm sm:normal-case sm:text-white/90">
        {email}
      </span>
      <button
        onClick={() => signOut()}
        className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20"
      >
        Sign out
      </button>
    </div>
  );
}
