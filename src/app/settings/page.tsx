'use client';

import { useEffect, useState } from 'react';

type Frequency = 'off' | 'weekly' | 'monthly' | 'yearly';
const STORAGE_KEY = 'oneline:summary_frequency';

export default function SettingsPage() {
  const [freq, setFreq] = useState<Frequency>('off');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as Frequency | null;
      if (v) setFreq(v);
    } catch { /* noop */ }
  }, []);

  function save() {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, freq);
      setSavedAt(new Date().toLocaleString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

        <section className="space-y-4 rounded-2xl bg-neutral-900/60 p-5 ring-1 ring-white/10">
          <fieldset className="space-y-2">
            <legend className="text-sm text-neutral-400">
              Summary delivery frequency
            </legend>

            {([
              { value: 'off', label: 'Disabled' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ] as { value: Frequency; label: string }[]).map((opt) => (
              <label key={opt.value} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="freq"
                  value={opt.value}
                  checked={freq === opt.value}
                  onChange={() => setFreq(opt.value)}
                  className="size-4"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white transition hover:bg-indigo-400 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save preferences'}
            </button>
            {savedAt && (
              <span className="text-xs text-neutral-400">
                Saved at {savedAt}
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-500">
            This only stores your preference in your browser for now, so your
            deployment stays lean and green. We can wire this to notifications
            later (email or in-app) without touching your current setup.
          </p>
        </section>
      </div>
    </main>
  );
}
