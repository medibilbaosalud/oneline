'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = createClientComponentClient();
  const router = useRouter();

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    router.push('/today');
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!accepted) {
      setMsg('Please accept the Privacy Policy and Terms to continue.');
      return;
    }
    if (pw.length < 8) {
      setMsg('Password must be at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      setMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        emailRedirectTo: `${origin}/today?welcome=1`,
        data: { has_consented: true },
      },
    });
    setLoading(false);

    if (error) { setMsg(error.message); return; }

    // Si tu proyecto exige confirmación por email, no tendrás session todavía.
    if (!data.session) {
      setMsg('We sent you a confirmation email. Open it to finish and you’ll land on Today.');
      return;
    }
    router.push('/today');
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

        <div className="mb-4 inline-flex rounded-lg bg-neutral-900 p-1 ring-1 ring-white/10">
          <button
            onClick={() => setMode('signin')}
            className={`rounded-md px-3 py-1.5 text-sm ${mode==='signin' ? 'bg-neutral-800' : 'text-zinc-300 hover:bg-neutral-800/60'}`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`rounded-md px-3 py-1.5 text-sm ${mode==='signup' ? 'bg-neutral-800' : 'text-zinc-300 hover:bg-neutral-800/60'}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={mode==='signin' ? onSignIn : onSignUp} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e=>setEmail(e.target.value)}
              className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-zinc-300">Password</label>
            <div className="flex items-center gap-2">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={pw}
                onChange={e=>setPw(e.target.value)}
                className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                placeholder="********"
                autoComplete={mode==='signin' ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={()=>setShowPw(s=>!s)}
                className="shrink-0 rounded-md bg-neutral-800 px-3 py-2 text-sm text-zinc-300 hover:bg-neutral-700"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {mode==='signup' && (
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={pw2}
                onChange={e=>setPw2(e.target.value)}
                className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
                placeholder="********"
                autoComplete="new-password"
              />
            </div>
          )}

          {mode==='signup' && (
            <label className="mt-2 flex items-start gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e=>setAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-white/20 bg-neutral-900 text-indigo-500"
              />
              <span>
                I accept the{' '}
                <Link href="/legal/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>
                {' '}and{' '}
                <Link href="/legal/terms" className="text-indigo-400 hover:underline">Terms</Link>.
              </span>
            </label>
          )}

          {msg && <p className="rounded-md bg-rose-900/30 p-2 text-sm text-rose-200">{msg}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (mode==='signup' && !accepted)}
              className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
            >
              {loading ? 'Working…' : mode==='signin' ? 'Sign in' : 'Create account'}
            </button>
          </div>

          {mode==='signin' && (
            <div className="pt-2 text-right">
              <Link href="/auth/reset" className="text-sm text-zinc-400 hover:text-zinc-200">
                Forgot your password?
              </Link>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}