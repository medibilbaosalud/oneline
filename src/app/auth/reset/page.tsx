'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ResetPage() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/update-password`,
    });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setMsg('We sent you a password reset email.');
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Reset password</h1>
        <form onSubmit={send} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          {msg && <p className="rounded-md bg-neutral-800 p-2 text-sm">{msg}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-40">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </main>
  );
}