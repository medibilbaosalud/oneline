"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import type { SummaryLanguage, SummaryPreferences } from "@/lib/summaryPreferences";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { persistSummary, uploadStoryImage, updateSummaryImage } from "@/lib/summaryHistory";
import type { SummaryMode, SummaryQuota } from "@/lib/summaryUsageDaily";
import jsPDF from "jspdf";
import { motion, AnimatePresence } from "framer-motion";

// Types
type Length = "short" | "medium" | "long";
type Tone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type Pov = "auto" | "first" | "third";
type Preset = "30" | "90" | "180" | "year" | "lastWeek" | "custom";
type EntryPayload = { content?: string; content_cipher?: string; iv?: string; created_at: string; day?: string };
type TextSegment = { text: string; bold: boolean };

// Constants
const WEEKLY_MINIMUM_DAYS = 4;
const WEEKLY_GUARD_BASE = "Write at least four days to unlock your first weekly story.";

const LOADING_FACTS = [
  "Journaling boosts immune cells! T-lymphocytes go up when you express yourself.",
  "Writing by hand engages more brain areas than typing (though typing is faster!).",
  "Most people forget 80% of their day within 24 hours.",
  "OneLine uses semantic AI to find patterns you might miss.",
  "Reflecting on gratitude improves sleep quality.",
  "Your brain loves narrative; it turns chaos into story to make sense of life.",
  "Expressive writing can lower blood pressure.",
  "Keeping a diary is cheaper than therapy (and you are the expert).",
  "Famous diarists: Frida Kahlo, Albert Einstein, Virginia Woolf.",
  "You are building a time machine for your future self."
];

// Props
type StoryGeneratorProps = {
  initialOptions?: SummaryPreferences;
  initialPreset?: Preset;
  initialRange?: { from: string; to: string } | null;
};

// Helpers
function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatStoryBlocks(story: string) {
  return story
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const escaped = escapeHtml(block);
      return escaped
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
    });
}

function parseSegments(raw: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const parts = raw.split(/(\*\*.+?\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      segments.push({ text: part.slice(2, -2), bold: true });
    } else if (part) {
      segments.push({ text: part, bold: false });
    }
  }
  return segments;
}

function inferPeriod(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const diff = Math.abs(t.getTime() - f.getTime()) / (1000 * 3600 * 24);
  if (diff < 8) return "week";
  if (diff < 35) return "month";
  if (diff < 100) return "quarter";
  return "year";
}

function extractTitle(story: string): string | undefined {
  const match = story.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

// Helper to add WAV header
function addWavHeader(samples: Uint8Array, sampleRate: number, numChannels: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length, true);

  const bytes = new Uint8Array(buffer);
  bytes.set(samples, 44);

  return buffer;
}


export default function StoryGenerator({
  initialOptions,
  initialPreset,
  initialRange,
}: StoryGeneratorProps) {
  const { dataKey, unlockWithPassphrase, getCurrentKey } = useVault();

  // State: Inputs
  const [length, setLength] = useState<Length>("medium");
  const [tone, setTone] = useState<Tone>("auto");
  const [pov, setPov] = useState<Pov>("auto");
  const [notes, setNotes] = useState("");
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [language, setLanguage] = useState<SummaryLanguage>("en");
  const [includeImage, setIncludeImage] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);

  // State: Range
  const [preset, setPreset] = useState<Preset>(initialPreset ?? "lastWeek");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // State: Execution
  const [mode, setMode] = useState<SummaryMode>("standard");
  const [loading, setLoading] = useState(false);
  const [loadingFact, setLoadingFact] = useState<string | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowShortRangeOverride, setAllowShortRangeOverride] = useState(false);

  // State: Result
  const [story, setStory] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState("audio/mp3");
  const [imageData, setImageData] = useState<string | null>(null);

  // State: Quota
  const [usageInfo, setUsageInfo] = useState<{ mode: string; usageUnits: number; remainingUnits: number; dailyLimit: number } | null>(null);
  const [quota, setQuota] = useState<SummaryQuota | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // State: Consent Modal
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [modalPassphrase, setModalPassphrase] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  const lengthGuidance: Record<Length, string> = {
    short: "Quick recap (~2-3 paragraphs)",
    medium: "Balanced narrative (~4-6 paragraphs)",
    long: "Deep dive (~8+ paragraphs)",
  };

  const propsSignature = useRef("");

  // Initialization Effect
  useEffect(() => {
    const signature = JSON.stringify({
      options: initialOptions ?? null,
      preset: initialPreset ?? null,
      range: initialRange ?? null,
    });

    if (propsSignature.current === signature) return;
    propsSignature.current = signature;

    if (initialOptions) {
      setLength(initialOptions.length);
      setTone(initialOptions.tone);
      setPov(initialOptions.pov);
      setNotes(initialOptions.notes ?? "");
      setLanguage(initialOptions.language ?? "en");
      setIncludeImage(true);
      setIncludeAudio(true);
    }

    if (initialRange) {
      setCustomFrom(initialRange.from);
      setCustomTo(initialRange.to);
      setPreset(initialPreset ?? "custom");
    } else if (initialPreset) {
      setPreset(initialPreset);
    }
  }, [initialOptions, initialPreset, initialRange]);

  // Quota
  const refreshQuota = useCallback(async () => {
    try {
      setQuotaLoading(true);
      setQuotaError(null);
      const res = await fetch("/api/summaries/quota", { cache: "no-store" });
      if (res.status === 401) {
        setQuota(null);
        setQuotaError("Sign in to see your monthly allowance.");
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? res.statusText);
      }
      const json = (await res.json()) as SummaryQuota;
      setQuota(json);
    } catch (err) {
      setQuotaError(err instanceof Error ? err.message : "Unable to load allowance");
    } finally {
      setQuotaLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshQuota();
  }, [refreshQuota]);

  // Loading Facts Effect
  useEffect(() => {
    if (!loading) {
      setLoadingFact(null);
      return;
    }
    let index = Math.floor(Math.random() * LOADING_FACTS.length);
    setLoadingFact(LOADING_FACTS[index]);
    const timer = setInterval(() => {
      index = (index + 1) % LOADING_FACTS.length;
      setLoadingFact(LOADING_FACTS[index]);
    }, 4000); // 4 seconds per fact
    return () => clearInterval(timer);
  }, [loading]);

  // Derived State
  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
    }
    const end = new Date();
    const start = new Date();
    if (preset === "lastWeek") {
      // Logic for last week
      const day = start.getDay();
      const diff = start.getDate() - day + (day == 0 ? -6 : 1) - 7; // Last Monday
      start.setDate(diff);
      const endD = new Date(start);
      endD.setDate(start.getDate() + 6);
      return { from: start.toISOString().slice(0, 10), to: endD.toISOString().slice(0, 10) };
    }
    if (preset === "30") start.setDate(end.getDate() - 30);
    else if (preset === "90") start.setDate(end.getDate() - 90);
    else if (preset === "180") start.setDate(end.getDate() - 180);
    else if (preset === "year") start.setMonth(0, 1);
    return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
  }, [preset, customFrom, customTo]);

  const formattedStory = useMemo(() => formatStoryBlocks(story), [story]);

  // --- ACTIONS ---

  function openConsent() {
    setModalError(null);
    setModalPassphrase("");
    setConsentChecked(false);
    setShowConsent(true);
  }

  const exportStoryAsPdf = useCallback(() => {
    if (!story) return;
    try {
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 20;
      const marginY = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - marginX * 2;
      let cursorY = marginY;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // const jsPDF = require("jspdf").default; 
      // Using import instead
      const pdf = new jsPDF();

      // Cover Page
      pdf.setFillColor(15, 15, 35);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      if (imageData) {
        try {
          const imgWidth = pageWidth - 100;
          const imgHeight = imgWidth;
          const imgX = (pageWidth - imgWidth) / 2;
          const imgY = 80;
          pdf.addImage(`data:image/png;base64,${imageData}`, "PNG", imgX, imgY, imgWidth, imgHeight);
          cursorY = imgY + imgHeight + 40;
        } catch (e) {
          console.warn("PDF Image Error", e);
          cursorY = 200;
        }
      } else {
        cursorY = 200;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(32);
      pdf.setTextColor(255, 255, 255);
      pdf.text("OneLine", pageWidth / 2, cursorY, { align: "center", baseline: "top" });
      cursorY += 40;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(14);
      pdf.setTextColor(180, 180, 200);
      pdf.text(`${from} → ${to}`, pageWidth / 2, cursorY, { align: "center", baseline: "top" });

      // Story Content
      pdf.addPage();
      cursorY = marginY;
      pdf.setFillColor(252, 252, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      const segmentsByParagraph = story.split(/\n\s*\n/).map(p => parseSegments(p.trim())).filter(p => p.length > 0);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(30, 30, 60);
      pdf.text("Your Story", marginX, cursorY, { baseline: "top" });
      cursorY += 20;

      pdf.setDrawColor(200, 200, 220);
      pdf.line(marginX, cursorY, marginX + 100, cursorY);
      cursorY += 20;

      pdf.setFontSize(12);
      pdf.setTextColor(40, 40, 50);

      const ensureSpace = (h: number) => {
        if (cursorY + h > pageHeight - marginY) {
          pdf.addPage();
          pdf.setFillColor(252, 252, 255);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
          cursorY = marginY;
        }
      };

      segmentsByParagraph.forEach(paragraph => {
        ensureSpace(lineHeight);
        let cursorX = marginX;
        paragraph.forEach(seg => {
          pdf.setFont("helvetica", seg.bold ? "bold" : "normal");
          const words = seg.text.split(/\s+/).filter(Boolean);
          words.forEach(word => {
            const w = pdf.getTextWidth(word + " ");
            if (cursorX + w > marginX + maxWidth) {
              cursorY += lineHeight;
              ensureSpace(lineHeight);
              cursorX = marginX;
            }
            pdf.text(word, cursorX, cursorY);
            cursorX += w + pdf.getTextWidth(" ");
          });
        });
        cursorY += lineHeight * 1.5;
      });

      pdf.save("oneline-story.pdf");
    } catch (err) {
      console.error(err);
      setError("Failed to export PDF.");
    }
  }, [story, imageData, from, to]);

  // --- CORE GENERATION LOGIC ---

  async function performGeneration(key: CryptoKey) {
    try {
      setLoading(true);
      setError(null);
      setStory("");
      setAudioUrl(null);
      setImageData(null);
      setAssetsLoading(false);

      const params = new URLSearchParams({ from, to });
      const historyRes = await fetch(`/api/history?${params.toString()}`, { cache: "no-store" });
      if (historyRes.status === 401) throw new Error("Please sign in.");

      const historyJson = await historyRes.json().catch(() => ({}));
      if (historyJson.error) throw new Error(historyJson.error);
      const entries = historyJson.entries ?? [];

      const decrypted: { content: string; created_at: string; day?: string | null }[] = [];
      for (const entry of entries) {
        if (entry.content_cipher && entry.iv) {
          try {
            const text = await decryptText(key, entry.content_cipher, entry.iv);
            if (text.trim()) decrypted.push({ content: text, created_at: entry.created_at, day: entry.day });
          } catch { throw new Error("Unable to decrypt some entries."); }
        } else if (entry.content) {
          decrypted.push({ content: entry.content, created_at: entry.created_at, day: entry.day });
        }
      }

      if (decrypted.length === 0) throw new Error("No decryptable entries in that range.");

      // Check minimum days logic
      const fromDate = new Date(`${from}T00:00:00Z`);
      const toDate = new Date(`${to}T00:00:00Z`);
      const diffDays = Math.max(1, Math.round((toDate.valueOf() - fromDate.valueOf()) / (1000 * 60 * 60 * 24)) + 1);
      const uniqueDays = new Set<string>();
      for (const entry of decrypted) {
        const dayKey = entry.day ?? entry.created_at.slice(0, 10);
        if (dayKey) uniqueDays.add(dayKey);
      }
      if (diffDays <= 8 && uniqueDays.size < WEEKLY_MINIMUM_DAYS && !allowShortRangeOverride) {
        const remainingDays = Math.max(1, WEEKLY_MINIMUM_DAYS - uniqueDays.size);
        throw new Error(`${WEEKLY_GUARD_BASE} You have ${uniqueDays.size}/${WEEKLY_MINIMUM_DAYS} days — ${remainingDays} more to go.`);
      }

      // STEP 1: Text Generation (Fast)
      const payload = {
        consent: true,
        from,
        to,
        mode,
        options: {
          length, tone, pov, includeHighlights, notes: notes.trim() || undefined, language,
          includeImage, includeAudio
        },
        entries: decrypted,
      };

      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || json?.error || "Failed to generate story");

      const storyText = json?.story || "";
      setStory(storyText); // SHOW TEXT IMMEDIATELY
      setLoading(false); // STOP SPINNER

      // Update Quota
      if (json?.usageUnits != null) {
        setUsageInfo({
          mode,
          usageUnits: json.usageUnits,
          remainingUnits: json.remainingUnits,
          dailyLimit: json.dailyLimit
        });
        refreshQuota();
      }

      // Persist TEXT only first to be safe
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;

      let summaryId: string | null = null;

      if (uid && storyText) {
        try {
          const createdId = await persistSummary(uid, key, storyText, {
            from, to, period: inferPeriod(from, to), title: extractTitle(storyText)
          });
          summaryId = createdId;
        } catch (e) {
          console.error("Failed to persist text summary", e);
        }
      }

      // STEP 2: Background Assets
      if (includeAudio || includeImage) {
        setAssetsLoading(true);
        // Call secondary endpoint
        fetch("/api/generate-story/assets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ story: storyText, options: payload.options })
        })
          .then(async (assetRes) => {
            const assetJson = await assetRes.json();

            if (assetJson.audioBase64) {
              const mime = assetJson.audioMimeType || 'audio/mp3';
              if (mime.toLowerCase().includes('l16') || mime.toLowerCase().includes('pcm')) {
                // Simplified WAV conversion or direct play
                setAudioUrl(`data:${mime};base64,${assetJson.audioBase64}`);
                setAudioMimeType(mime);
              } else {
                setAudioUrl(`data:${mime};base64,${assetJson.audioBase64}`);
                setAudioMimeType(mime);
              }
            }

            if (assetJson.imageBase64) {
              const imgB64 = assetJson.imageBase64;
              setImageData(imgB64);

              // Upload Image and Update Summary Record
              if (uid && summaryId) {
                try {
                  const url = await uploadStoryImage(uid, imgB64);
                  if (url) {
                    await updateSummaryImage(uid, summaryId, url);
                    console.log("Updated summary with image URL:", url);
                  }
                } catch (e) {
                  console.error("Failed to background upload image", e);
                }
              }
            }
          })
          .finally(() => setAssetsLoading(false));
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
      setLoading(false);
    } finally {
      setModalBusy(false);
    }
  }

  async function confirmConsent() {
    if (!consentChecked) {
      setModalError("Please confirm you consent to sharing your decrypted entries.");
      return;
    }
    setModalBusy(true);
    setModalError(null);

    try {
      let key = dataKey ?? null;
      if (!key) {
        const passphrase = modalPassphrase.trim();
        if (!passphrase) {
          setModalError("Enter your passphrase to unlock the vault.");
          setModalBusy(false);
          return;
        }
        try {
          await unlockWithPassphrase(passphrase);
        } catch (err) {
          setModalError(err instanceof Error ? err.message : "Unable to unlock with that passphrase.");
          setModalBusy(false);
          return;
        }
        key = getCurrentKey();
        if (!key) {
          setModalError("Vault is still locked. Try again.");
          setModalBusy(false);
          return;
        }
      }
      setShowConsent(false);
      await performGeneration(key);
    } finally {
      setModalPassphrase("");
    }
  }

  return (
    <div className="w-full space-y-8 text-zinc-100">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/60 to-indigo-900/20 p-5 shadow-2xl shadow-indigo-950/40">
        {/* HEADER / QUOTA UI matches original */}
        <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Quota</p>
            {quotaLoading ? <p className="text-sm text-zinc-300">Checking...</p> :
              quotaError ? <p className="text-sm text-rose-400">{quotaError}</p> :
                quota ? (
                  <p className="text-sm text-zinc-100">
                    {quota.unlimited ? <span className="font-semibold">Unlimited</span> : <><span className="font-semibold">{quota.remaining}</span> left</>}
                  </p>
                ) : <p className="text-sm text-zinc-300">Sign in</p>
            }
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: quota && !quota.unlimited ? `${(quota.used / quota.limit) * 100}%` : '100%' }} />
            </div>
          </div>
          {/* Info Cards */}
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Voice</p>
            <p className="text-sm text-zinc-100">Tone & style are preserved.</p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Privacy</p>
            <p className="text-sm text-zinc-100">Decrypted only for generation.</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Period</span>
            <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="lastWeek">Last week</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="year">Year to date</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {preset === "custom" && (
            <>
              <label className="flex flex-col gap-2"><span className="text-sm text-zinc-400">From</span><input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2" /></label>
              <label className="flex flex-col gap-2"><span className="text-sm text-zinc-400">To</span><input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2" /></label>
            </>
          )}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Length</span>
            <select value={length} onChange={(e) => setLength(e.target.value as Length)} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2"><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Tone</span>
            <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2"><option value="auto">Auto</option><option value="warm">Warm</option><option value="direct">Direct</option></select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as SummaryMode)} className="rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2"><option value="standard">Standard (1 unit)</option><option value="advanced">Advanced (2 units)</option></select>
          </label>

          {/* Multimedia Toggles */}
          <div className="flex flex-col gap-2 pt-6">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={includeImage} onChange={e => setIncludeImage(e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-indigo-500" /> Generate Cover
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="checkbox" checked={includeAudio} onChange={e => setIncludeAudio(e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-indigo-500" /> Generate Audio
            </label>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={openConsent}
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Story"}
          </button>
          {error && <span className="text-sm text-rose-400">{error}</span>}
          {error?.startsWith(WEEKLY_GUARD_BASE) && (
            <button onClick={() => { setAllowShortRangeOverride(true); setError(null); openConsent(); }} className="text-sm underline text-indigo-300">
              Generate anyway
            </button>
          )}
        </div>
      </div>

      {/* RESULTS AREA */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 p-5 shadow-2xl shadow-indigo-950/40" aria-busy={loading}>
        {loading && (
          <div className="relative space-y-4 py-8 text-center">
            <div className="flex justify-center"><div className="h-4 w-4 animate-ping rounded-full bg-indigo-400" /></div>
            <p className="text-indigo-200 animate-pulse font-medium">Crafting your story...</p>
            <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-indigo-400">Fun Fact</p>
              <p className="font-serif text-lg italic text-zinc-100 min-h-[3rem] transition-all duration-300">
                “{loadingFact || "Connecting content..."}”
              </p>
            </div>
          </div>
        )}

        {!loading && story && (
          <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-indigo-900/20 to-purple-900/10 p-5 shadow-xl shadow-indigo-950/40">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-6 bg-indigo-400 rounded-full" />
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-100">Your Story</span>
              </div>
              <div className="flex items-center gap-3">
                {assetsLoading && <span className="text-[10px] uppercase tracking-wide text-zinc-400 animate-pulse">Generating Assets...</span>}
                <button onClick={exportStoryAsPdf} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10">Export PDF</button>
              </div>
            </div>

            {/* Assets Grid */}
            {(imageData || audioUrl || assetsLoading) && (
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                {includeImage && (imageData ? (
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10">
                    <img src={`data:image/png;base64,${imageData}`} className="h-full w-full object-cover" alt="Story Cover" />
                  </div>
                ) : assetsLoading ? (
                  <div className="flex aspect-square flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 animate-pulse">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                    <span className="mt-2 text-xs text-zinc-500">Painting cover...</span>
                  </div>
                ) : null)}

                {includeAudio && (audioUrl ? (
                  <div className="rounded-xl border border-white/10 bg-indigo-900/20 p-4 flex flex-col justify-center">
                    <p className="text-sm font-bold text-white mb-2">Audio Narration</p>
                    <audio controls src={audioUrl} className="w-full text-indigo-500 h-8" />
                  </div>
                ) : assetsLoading ? (
                  <div className="flex h-full min-h-[100px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 animate-pulse">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                    <span className="mt-2 text-xs text-zinc-500">Recording voice...</span>
                  </div>
                ) : null)}
              </div>
            )}

            <div className="space-y-4 font-serif text-lg leading-relaxed text-zinc-100">
              {formattedStory.map((block, i) => (
                <p key={i} className="" dangerouslySetInnerHTML={{ __html: block }} />
              ))}
            </div>
          </article>
        )}

        {!loading && !story && <p className="text-center text-zinc-500 py-10">Your story will appear here.</p>}
      </div>

      {/* CONSENT MODAL */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Generate Story?</h3>
            <p className="mt-2 text-sm text-zinc-400">
              Your decrypted entries will be sent to our AI backend. OneLine never duplicates your passphrase.
            </p>
            <label className="mt-4 flex items-start gap-3 rounded-lg bg-black/20 p-3">
              <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} className="mt-1" />
              <span className="text-sm text-zinc-300">I consent to process my journal entries.</span>
            </label>
            {!dataKey && (
              <div className="mt-4">
                <input type="password" value={modalPassphrase} onChange={e => setModalPassphrase(e.target.value)} placeholder="Enter Vault Passphrase" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-white" />
              </div>
            )}
            {modalError && <p className="mt-2 text-sm text-rose-400">{modalError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowConsent(false); setModalBusy(false); }} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={confirmConsent} disabled={modalBusy || !consentChecked} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                {modalBusy ? "Unlocking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
