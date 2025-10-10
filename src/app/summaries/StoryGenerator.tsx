"use client";

import { useMemo, useState } from "react";

type PresetKey = "1m" | "3m" | "6m" | "ytd";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "1m",  label: "Last month" },
  { key: "3m",  label: "Last 3 months" },
  { key: "6m",  label: "Last 6 months" },
  { key: "ytd", label: "This year" },
];

function ymdLocal(d: Date) {
  // YYYY-MM-DD en zona local (no UTC) para que coincida con tus created_at
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function startOfYearLocal(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function subMonthsLocal(d: Date, n: number) {
  // restar meses respetando zona local
  const nd = new Date(d);
  nd.setMonth(nd.getMonth() - n);
  return nd;
}

export default function StoryGenerator() {
  const [preset, setPreset] = useState<PresetKey>("1m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");

  const { from, to } = useMemo(() => {
    const today = new Date();
    if (preset === "ytd") {
      return { from: ymdLocal(startOfYearLocal(today)), to: ymdLocal(today) };
    }
    const months = preset === "6m" ? 6 : preset === "3m" ? 3 : 1;
    const fromD = subMonthsLocal(today, months);
    return { from: ymdLocal(fromD), to: ymdLocal(today) };
  }, [preset]);

  async function generate() {
    setLoading(true);
    setError(null);
    setStory("");

    const url = new URL("/api/year-story", window.location.origin);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    // (Opcional) controles extra:
    // url.searchParams.set("length", "medium");
    // url.searchParams.set("tone", "auto");
    // url.searchParams.set("highlights", "true");

    try {
      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to generate story");
      }
      const data = await res.json();
      setStory(data.story || "");
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6"></div>