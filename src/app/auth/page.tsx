'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const sb = supabaseBrowser();

      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
      }

      // Ensure server picks up session cookies
      router.refresh();
      router.push('/today');
    } catch (e) {
      const message = e instanceof Error && e.message ? e.message : 'Authentication failed';
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-neutral-950 text-zinc-100">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 py-12 lg:grid-cols-2">
        {/* Marketing / copy */}
        <section className="order-2 lg:order-1">
          <h1 className="bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-4xl font-semibold leading-tight text-transparent md:text-6xl">
            One honest line a day.
            <span className="block bg-gradient-to-r from-emerald-300 to-indigo-400 bg-clip-text text-transparent">
              A tiny habit that compounds.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-zinc-400">
            Capture one line in seconds. Private by design. Generate month/quarter/year stories when you want.
          </p>
        </section>

        {/* Card */}
        <section className="order-1 lg:order-2">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <div className="absolute -inset-20 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_60%)] blur-2xl" />
            <header className="mb-4">
              <h2 className="text-xl font-semibold">Sign {mode === 'signin' ? 'in' : 'up'}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {mode === 'signin' ? 'Welcome back.' : 'Create your account.'}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-zinc-300">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-zinc-300">Password</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </label>

              {err && <p className="text-sm text-rose-400">{err}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-zinc-400">
              {mode === 'signin' ? (
                <>
                  New here?{' '}
                  <button
                    className="text-indigo-400 hover:text-indigo-300"
                    onClick={() => setMode('signup')}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    className="text-indigo-400 hover:text-indigo-300"
                    onClick={() => setMode('signin')}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-zinc-500">
              By continuing you agree to our{' '}
              <a href="/terms" className="underline decoration-zinc-600 hover:text-zinc-300">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline decoration-zinc-600 hover:text-zinc-300">
                Privacy Policy
              </a>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
