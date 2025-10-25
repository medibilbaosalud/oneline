// src/app/consent/page.tsx
"use client";
import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ConsentPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [privacy, setPrivacy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [age, setAge] = useState(false);
  const canSave = privacy && terms && age;

  async function accept() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").upsert({
      id: user.id,
      consent_privacy: privacy,
      consent_terms: terms,
      consent_marketing: marketing,
      age_confirmed: age,
      consent_at: new Date().toISOString(),
    });

    window.location.href = "/today";
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6">
      <div className="w-full rounded-2xl border border-white/10 bg-neutral-900/80 p-6 text-zinc-200">
        <h1 className="text-2xl font-semibold text-white">One step before continuing</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Please accept our Terms and Privacy Policy to use OneLine.
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)} className="mt-1"/>
            <span>I accept the <a href="/privacy" target="_blank" className="underline">Privacy Policy</a>.</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} className="mt-1"/>
            <span>I accept the <a href="/terms" target="_blank" className="underline">Terms of Service</a>.</span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={age} onChange={e=>setAge(e.target.checked)} className="mt-1"/>
            <span>I confirm I’m old enough to use the service in my country.</span>
          </label>
          <label className="flex items-start gap-3 opacity-80">
            <input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)} className="mt-1"/>
            <span>Optional: I want to receive product updates by email.</span>
          </label>
        </div>

        <button
          disabled={!canSave}
          onClick={accept}
          className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Accept and continue
        </button>
      </div>
    </main>
  );
}