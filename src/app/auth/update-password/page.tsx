'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function UpdatePasswordPage() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw !== pw2) { setMsg('Passwords do not match.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    router.push('/today');
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="mx-auto max-w-md px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Set a new password</h1>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={pw}
            onChange={e=>setPw(e.target.value)}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={pw2}
            onChange={e=>setPw2(e.target.value)}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-indigo-500"
          />
          {msg && <p className="rounded-md bg-neutral-800 p-2 text-sm">{msg}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400 disabled:opacity-40">
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </main>
  );
}