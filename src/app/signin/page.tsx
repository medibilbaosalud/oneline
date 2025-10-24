'use client';

import { Suspense, useMemo, useState, type ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useSearchParams } from 'next/navigation';

function SignInShell({ heading, body }: { heading: string; body: ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-50">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900/60 p-6 ring-1 ring-white/10">
        <h1 className="text-xl font-semibold mb-4">{heading}</h1>
        {body}
      </div>
    </main>
  );
}

function SignInFallback() {
  return (
    <SignInShell
      heading="Sign in"
      body={
        <div className="space-y-3 text-sm text-neutral-400">
          <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-800/60" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-800/60" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-neutral-800/60" />
        </div>
      }
    />
  );
}

function SignInContent() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const searchParams = useSearchParams();
  const redirectTarget = useMemo(() => {
    const raw = searchParams?.get('redirectTo');
    if (!raw || !raw.startsWith('/')) return '/today';
    return raw;
  }, [searchParams]);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSendLink() {
    setErr(null);
    setLoading(true);
    try {
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL ?? '';

      const callback = redirectTarget
        ? `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTarget)}`
        : `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callback,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SignInShell
      heading="Sign in"
      body={
        sent ? (
          <p className="text-sm text-neutral-300">
            We sent you a sign-in link. Check your inbox.
          </p>
        ) : (
          <>
            <label className="block text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 px-3 py-2 outline-none"
              placeholder="you@example.com"
            />
            {err && <p className="mt-2 text-sm text-rose-400">{err}</p>}
            <button
              onClick={handleSendLink}
              disabled={!email || loading}
              className="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400 disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </>
        )
      }
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent />
    </Suspense>
  );
}
