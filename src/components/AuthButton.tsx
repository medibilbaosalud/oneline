"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

type AuthButtonProps = {
  variant?: "landing" | "card";
};

export default function AuthButton({ variant = "landing" }: AuthButtonProps) {
  const { data: session, status } = useSession();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      setRedirecting(false);
    }
  }, [status]);

  const startGitHubSignIn = () => {
    setRedirecting(true);
    void signIn("github", { callbackUrl: "/today" });
  };

  if (status === "loading") {
    if (variant === "card") {
      return (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70"
          disabled
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/40" />
          Checking session…
        </button>
      );
    }

    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-white/70 backdrop-blur"
        disabled
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white/50" />
        Checking session…
      </button>
    );
  }

  if (status !== "authenticated") {
    if (variant === "card") {
      return (
        <button
          type="button"
          onClick={startGitHubSignIn}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={redirecting}
          aria-busy={redirecting}
        >
          <span className="text-lg">🐙</span>
          {redirecting ? "Redirecting to GitHub…" : "Continue with GitHub"}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={startGitHubSignIn}
        className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 shadow-lg shadow-indigo-500/20 transition hover:-translate-y-px hover:shadow-xl hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-80"
        disabled={redirecting}
        aria-busy={redirecting}
      >
        <span className="text-lg">🐙</span>
        {redirecting ? "Redirecting…" : "Sign in with GitHub"}
      </button>
    );
  }

  const email = session.user?.email ?? session.user?.name ?? "Signed in";

  if (variant === "card") {
    return (
      <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-50">
        <p>
          Signed in as <span className="font-semibold text-emerald-100">{email}</span>
        </p>
        <Link
          href="/today"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:bg-emerald-400/30"
        >
          Continue to Today
        </Link>
      </div>
    );
  }

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
        type="button"
        onClick={() => signOut()}
        className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white/80 transition hover:bg-white/20"
      >
        Sign out
      </button>
    </div>
  );
}
