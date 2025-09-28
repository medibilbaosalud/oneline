"use client";
import { useState } from "react";

export default function TodayPage() {
  const [date] = useState(() => new Date().toISOString().slice(0, 10));
  const [s1, setS1] = useState("");
  const [s2, setS2] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(slot: 1 | 2, content: string) {
    setSaving(true);
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryDate: date, slot, content }),
    });
    setSaving(false);
    if (!res.ok) alert("Error guardando");
    else alert(`Guardado línea ${slot}`);
  }

  const areaCls =
    "w-full h-28 rounded bg-neutral-900 text-neutral-100 placeholder:text-neutral-500 " +
    "border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-400 p-3";

  const btnCls =
    "mt-2 px-3 py-2 rounded bg-white/20 hover:bg-white/30 transition disabled:opacity-60";

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Hoy ({date})</h1>

      <section>
        <label className="text-sm block mb-2">Línea 1</label>
        <textarea
          className={areaCls}
          value={s1}
          onChange={(e) => setS1(e.target.value.slice(0, 300))}
          placeholder="Escribe una frase corta de hoy…"
        />
        <div className="text-xs opacity-70 mt-1">{s1.length}/300</div>
        <button disabled={saving} onClick={() => save(1, s1)} className={btnCls}>
          Guardar línea 1
        </button>
      </section>

      <section>
        <label className="text-sm block mb-2">Línea 2</label>
        <textarea
          className={areaCls}
          value={s2}
          onChange={(e) => setS2(e.target.value.slice(0, 300))}
          placeholder="Y si quieres, otra frase…"
        />
        <div className="text-xs opacity-70 mt-1">{s2.length}/300</div>
        <button disabled={saving} onClick={() => save(2, s2)} className={btnCls}>
          Guardar línea 2
        </button>
      </section>
    </div>
  );
}
