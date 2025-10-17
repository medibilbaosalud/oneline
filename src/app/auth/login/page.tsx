'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Redirect to /today if the user already has an active session
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/today');
      setChecking(false);
    });
  }, [supabase, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailRedirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo }
    });

    if (error) setError(error.message);
    else setSent(true);
  }

  if (checking) return null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

        {sent ? (
          <p className="text-neutral-300">
            Check your email. We sent you a magic link to sign in.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10"
            />
            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-400"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
