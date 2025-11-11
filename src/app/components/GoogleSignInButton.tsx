"use client";

import { signIn } from 'next-auth/react';

type GoogleSignInButtonProps = {
  className?: string;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.8 32.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 19.2-8.4 19.2-20c0-1.3-.1-2.2-.6-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 16 18.8 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.2 4 9.5 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.4-5.3l-6.2-4.9C29.1 35.8 26.7 36 24 36c-5.2 0-9.7-3.3-11.3-7.9l-6.5 5C9.4 39.8 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.3-3.8 5.8-7.3 6.8l6.2 4.9C36.5 41.3 40 35.8 40 28c0-2.6-.2-4.5-.4-5.7z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const defaultClasses =
    "flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-neutral-900/70 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  const resolvedClassName = className ?? defaultClasses;

  return (
    <button
      type="button"
      aria-label="Sign in with Google"
      onClick={() => signIn('google', { callbackUrl: '/today' })}
      className={resolvedClassName}
    >
      <span className="inline-flex items-center gap-3">
        <GoogleIcon />
        Sign in with Google
      </span>
    </button>
  );
}
