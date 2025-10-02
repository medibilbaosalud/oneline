'use client';

import { useEffect, useState } from 'react';

type Settings = {
  user_id: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  delivery: 'in_app' | 'email';
  timezone: string;
  hour_utc: number;
  last_summary_at: string | null;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then(setS);
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          frequency: s.frequency,
          delivery: s.delivery,
          timezone: s.timezone,
          hour_utc: s.hour_utc,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!s) return null;

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-2xl p-6 space-y-8">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <section className="rounded-xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
          <h2 className="mb-4 font-medium">Summary cadence</h2>
          <div className="grid grid-cols-3 gap-3">
            {(['weekly', 'monthly', 'yearly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setS({ ...s, frequency: f })}
                className={`rounded-lg px-3 py-2 capitalize ${
                  s.frequency === f ? 'bg-indigo-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
          <h2 className="mb-4 font-medium">Delivery</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['in_app', 'email'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setS({ ...s, delivery: d })}
                className={`rounded-lg px-3 py-2 capitalize ${
                  s.delivery === d ? 'bg-indigo-500 text-white' : 'bg-neutral-800 hover:bg-neutral-700'
                }`}
              >
                {d.replace('_', ' ')}
              </button>
            ))}
          </div>
          {s.delivery === 'email' && (
            <p className="mt-3 text-sm opacity-70">
              * Email sending not enabled yet. We’ll add Resend or Gmail later.
            </p>
          )}
        </section>

        <section className="rounded-xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
          <h2 className="mb-4 font-medium">Time</h2>
          <div className="flex gap-3 items-center">
            <label className="text-sm opacity-70">UTC hour</label>
            <input
              type="number"
              min={0}
              max={23}
              value={s.hour_utc}
              onChange={(e) => setS({ ...s, hour_utc: Number(e.target.value) })}
              className="w-20 rounded bg-neutral-800 px-2 py-1 outline-none"
            />
            <input
              type="text"
              value={s.timezone}
              onChange={(e) => setS({ ...s, timezone: e.target.value })}
              className="flex-1 rounded bg-neutral-800 px-3 py-1 outline-none"
              placeholder="e.g. Europe/Madrid"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </main>
  );
}
