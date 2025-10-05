'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/today';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.replace(next);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">
          {mode === 'signin' ? 'Sign in to OneLine' : 'Create your OneLine account'}
        </h1>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('signin')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'signin' ? 'bg-neutral-800' : 'bg-neutral-900'}`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`rounded-md px-3 py-2 text-sm ${mode === 'signup' ? 'bg-neutral-800' : 'bg-neutral-900'}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md bg-neutral-800 px-3 py-2 outline-none"
            />
          </label>

          <label className="block text-sm">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md bg-neutral-800 px-3 py-2 outline-none"
            />
          </label>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-400">
          You’ll be redirected back to <span className="text-neutral-200">{next}</span> after auth.
        </p>
      </div>
    </main>
  );
}
