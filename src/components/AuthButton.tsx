'use client';

import { useEffect, useState } from 'react';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; email: string };

export default function AuthButton() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/auth/user', { cache: 'no-store' });
        const j = await r.json();
        if (j?.email) setAuth({ status: 'signedIn', email: j.email });
        else setAuth({ status: 'signedOut' });
      } catch {
        setAuth({ status: 'signedOut' });
      }
    })();
  }, []);

  async function signOut() {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      location.href = '/';
    }
  }

  if (auth.status === 'loading') {
    return (
      <div className="rounded-md bg-neutral-800/80 px-3 py-2 text-xs text-neutral-300">
        …
      </div>
    );
  }

  if (auth.status === 'signedOut') {
    return (
      <a
        href="/auth"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden truncate text-sm text-neutral-300 md:block">
        {auth.email}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="rounded-md border border-white/10 bg-neutral-900 px-3 py-2 text-sm font-medium text-white shadow hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}