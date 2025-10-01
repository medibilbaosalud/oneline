'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginCard() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<null | 'sign-in' | 'sign-up'>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setMessage(null);
    setBusy('sign-in');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setBusy(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push('/today');
    router.refresh();
  };

  const handleSignUp = async () => {
    setMessage(null);
    setBusy('sign-up');

    const { data, error } = await supabase.auth.signUp({ email, password });

    setBusy(null);
    if (error) {
      setMessage(error.message);
      return;
    }

    // Si tu proyecto tiene "Email confirmations" activadas, el user debe confirmar por email
    setMessage('Check your inbox to confirm your account.');
  };

  const disabled = busy !== null || !email || !password;

  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900/60 p-8 shadow-xl backdrop-blur">
      <h1 className="text-3xl font-semibold">Welcome to OneLine</h1>
      <p className="mt-2 text-sm text-white/70">Write one line every day ✍️</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/80">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none ring-0 focus:border-white/20"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/80">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none ring-0 focus:border-white/20"
            autoComplete="current-password"
          />
        </div>

        {message && (
          <p className="text-sm text-red-400">{message}</p>
        )}

        <button
          onClick={handleSignIn}
          disabled={disabled}
          className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-500/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === 'sign-in' ? 'Signing in…' : 'Sign in'}
        </button>

        <button
          onClick={handleSignUp}
          disabled={busy !== null || !email || !password}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy === 'sign-up' ? 'Creating account…' : 'Create account'}
        </button>
      </div>
    </div>
  );
}
