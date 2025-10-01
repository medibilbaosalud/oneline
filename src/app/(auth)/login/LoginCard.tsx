'use client';

import { useMemo, useState } from 'react';

type Err = string | null;

export default function LoginCard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // <- vacío: no hay bullets hasta que el usuario escribe
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<Err>(null);

  const disabled = loading || !email || !password;

  // Si estás usando Supabase, descomenta dentro de estos handlers.
  async function handleSignIn() {
    setLoading(true);
    setErr(null);
    try {
      // const { createClient } = await import('@supabase/supabase-js');
      // const supabase = createClient(
      //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      // );
      // const { error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) throw error;
      // window.location.href = '/today';

      // Temporal (si todavía no conectas auth):
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = '/today';
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setErr(null);
    try {
      // const { createClient } = await import('@supabase/supabase-js');
      // const supabase = createClient(
      //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
      //   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      // );
      // const { error } = await supabase.auth.signUp({ email, password });
      // if (error) throw error;
      // window.location.href = '/today';

      // Temporal:
      await new Promise((r) => setTimeout(r, 600));
      window.location.href = '/today';
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl bg-neutral-900/70 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome to OneLine</h1>
      <p className="mt-1 text-sm text-neutral-300">Write one line every day ✍️</p>

      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 inline-block text-neutral-300">Email</span>
          <input
            className="w-full rounded-lg bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 inline-block text-neutral-300">Password</span>
          <input
            className="w-full rounded-lg bg-neutral-800 px-3 py-2 outline-none ring-1 ring-white/10 placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500"
            type="password"
            autoComplete="current-password" // o "new-password" si es el formulario de alta
            placeholder="Enter your password"
            value={password}                 // <- sin defaultValue ni ‘*******’
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {!!err && <p className="text-sm text-rose-400">{err}</p>}

        <button
          disabled={disabled}
          onClick={handleSignIn}
          className="w-full rounded-lg bg-indigo-500 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          onClick={handleSignUp}
          className="w-full rounded-lg bg-neutral-800 py-2 font-medium text-neutral-100 transition hover:bg-neutral-700"
        >
          Create account
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        By continuing you agree to our terms. Be kind to yourself — just one line a day.
      </p>
    </div>
  );
}
