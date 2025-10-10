// src/app/settings/page.tsx  (o el archivo correcto)
"use client";

import { useState } from "react";

type Freq = "weekly" | "monthly" | "yearly";

export default function SettingsPage() {
  const [frequency, setFrequency] = useState<Freq>("weekly");

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl p-6 space-y-8">
        {/* ...otros bloques... */}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-medium">Email summaries</h2>

          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="freq" className="text-sm text-zinc-400">
              Frequency
            </label>

            <select
              id="freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Freq)}
              className="bg-neutral-900 ring-1 ring-white/10 rounded-md p-2 outline-none"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </section>
      </div>
    </main>
  );
}