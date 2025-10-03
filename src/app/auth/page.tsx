'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (!error) setSent(true);
  }

  async function signInWith(provider: 'github' | 'google') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-2xl font-semibold">Sign in</h1>

        <div className="space-y-3">
          <button
            onClick={() => signInWith('github')}
            className="w-full rounded-lg bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
          >
            Continue with GitHub
          </button>

          <button
            onClick={() => signInWith('google')}
            className="w-full rounded-lg bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
          >
            Continue with Google
          </button>
        </div>

        <div className="my-6 h-px bg-neutral-800" />

        {sent ? (
          <p className="text-sm text-neutral-400">
            Check your inbox — we’ve sent you a magic link.
          </p>
        ) : (
          <form onSubmit={signInWithEmail} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
            >
              Send magic link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
