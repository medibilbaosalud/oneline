// src/app/summaries/StoryGenerator.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import type { SummaryLanguage, SummaryPreferences } from "@/lib/summaryPreferences";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { persistSummary } from "@/lib/summaryHistory";
import type { SummaryMode } from "@/lib/summaryUsageDaily";

const WEEKLY_MINIMUM_DAYS = 4;
const WEEKLY_GUARD_BASE = "Write at least four days to unlock your first weekly story.";

type Length = "short" | "medium" | "long";
type Tone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type Pov = "auto" | "first" | "third";
type Preset = "30" | "90" | "180" | "year" | "lastWeek" | "custom";

type TextSegment = {
  text: string;
  bold: boolean;
};

type StoryGeneratorProps = {
  initialOptions?: SummaryPreferences;
  initialPreset?: Preset;
  initialRange?: { from: string; to: string } | null;
};

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
      return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />");
    });
}

function ymd(d: Date) {
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
}

function parseSegments(paragraph: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(paragraph)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: paragraph.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < paragraph.length) {
    segments.push({ text: paragraph.slice(lastIndex), bold: false });
  }

  return segments;
}

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function inferPeriod(start: string, end: string): "weekly" | "monthly" | "yearly" {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "monthly";
  const diffDays = Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)));
  if (diffDays <= 10) return "weekly";
  if (diffDays <= 62) return "monthly";
  return "yearly";
}

async function loadScriptWithFallback(sources: string[]) {
  let lastError: Error | null = null;

  for (const src of sources) {
    // If already present, resolve immediately
    if (document.querySelector(`script[src="${src}"]`)) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.crossOrigin = "anonymous";
        script.referrerPolicy = "no-referrer";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.body.appendChild(script);
      });
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("Unable to load scripts");
}

function lastWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const end = new Date(now);
  end.setDate(now.getDate() - (day === 0 ? 7 : day));
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { from: ymd(start), to: ymd(end) };
}

type Quota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  unlimited?: boolean;
  period: {
    start: string;
    end: string;
  };
};

type EntryPayload = {
  id: string;
  created_at: string;
  day?: string | null;
  content_cipher?: string | null;
  iv?: string | null;
  content?: string | null;
};

function addWavHeader(samples: Uint8Array, sampleRate: number, numChannels: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + samples.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, samples.length, true);

  // Write the PCM samples
  const bytes = new Uint8Array(buffer);
  bytes.set(samples, 44);

  return bytes;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default function StoryGenerator({
  initialOptions,
  initialPreset,
  initialRange,
}: StoryGeneratorProps) {
  const { dataKey, unlockWithPassphrase, getCurrentKey } = useVault();
  // Preset + from/to
  const today = useMemo(() => new Date(), []);
  const [preset, setPreset] = useState<Preset>(initialPreset ?? (initialRange ? "custom" : "lastWeek"));
  const [customFrom, setCustomFrom] = useState<string>(initialRange?.from ?? ymd(addDays(today, -30)));
  const [customTo, setCustomTo] = useState<string>(initialRange?.to ?? ymd(today));

  // Options
  const [length, setLength] = useState<Length>(initialOptions?.length ?? "medium");
  const [tone, setTone] = useState<Tone>(initialOptions?.tone ?? "auto");
  const [pov, setPov] = useState<Pov>(initialOptions?.pov ?? "auto");
  const [mode, setMode] = useState<SummaryMode>("standard");
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [includeImage, setIncludeImage] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [notes, setNotes] = useState(initialOptions?.notes ?? "");
  const [language, setLanguage] = useState<SummaryLanguage>(initialOptions?.language ?? "en");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/mp3");
  const [imageData, setImageData] = useState<string | null>(null);
  const formattedStory = useMemo(() => (story ? formatStoryBlocks(story) : []), [story]);
  const [loadingPhrase, setLoadingPhrase] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalPassphrase, setModalPassphrase] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [allowShortRangeOverride, setAllowShortRangeOverride] = useState(false);
  const [usageInfo, setUsageInfo] = useState<
    | { mode: SummaryMode; usageUnits: number; remainingUnits: number; dailyLimit: number }
    | null
  >(null);

  const lengthGuidance: Record<Length, string> = {
    short: "~200–300 words",
    medium: "~600–800 words",
    long: "~1200+ words",
  };

  const loadingPhrases = [
    "Weaving your week together…",
    "Threading highlights without changing your words…",
    "Letting your tone lead the story…",
    "Balancing bright spots and low points…",
    "Keeping languages exactly as you wrote them…",
  ];

  // Resolve the date range according to the preset
  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom, to: customTo };
    }
    if (preset === "lastWeek") {
      return lastWeekRange();
    }
    const now = new Date();
    if (preset === "year") {
      return { from: ymd(startOfYear(now)), to: ymd(now) };
    }
    if (preset === "30") {
      return { from: ymd(addDays(now, -30)), to: ymd(now) };
    }
    if (preset === "90") {
      return { from: ymd(addDays(now, -90)), to: ymd(now) };
    }
    // 180
    return { from: ymd(addDays(now, -180)), to: ymd(now) };
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    setAllowShortRangeOverride(false);
  }, [from, to]);

  const propsSignature = useRef<string | null>(null);

  const exportStoryAsPdf = useCallback(async () => {
    if (!story) {
      setError("Generate a story before exporting.");
      return;
    }

    try {
      await loadScriptWithFallback([
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      ]);

      const { jsPDF } = (window as any).jspdf || {};

      if (!jsPDF) {
        throw new Error("PDF tools unavailable");
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const marginX = 50;
      const marginY = 50;
      const maxWidth = pageWidth - marginX * 2;
      let cursorY = marginY;
      const lineHeight = 20;

      // ========== COVER PAGE ==========
      // Dark gradient background simulation (solid color since jsPDF doesn't support gradients)
      pdf.setFillColor(15, 15, 35); // Dark navy
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Cover image (if available)
      if (imageData) {
        try {
          const imgWidth = pageWidth - 100;
          const imgHeight = imgWidth; // Square image
          const imgX = (pageWidth - imgWidth) / 2;
          const imgY = 80;

          // Add the image
          pdf.addImage(
            `data:image/png;base64,${imageData}`,
            "PNG",
            imgX,
            imgY,
            imgWidth,
            imgHeight
          );
          cursorY = imgY + imgHeight + 40;
        } catch (imgErr) {
          console.warn("Could not add image to PDF:", imgErr);
          cursorY = 120;
        }
      } else {
        cursorY = 200;
      }

      // App title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(32);
      pdf.setTextColor(255, 255, 255);
      pdf.text("OneLine", pageWidth / 2, cursorY, { align: "center", baseline: "top" });
      cursorY += 40;

      // Story subtitle
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(14);
      pdf.setTextColor(180, 180, 200);
      const dateLine = from && to ? `${from} → ${to}` : "Your personal story";
      pdf.text(dateLine, pageWidth / 2, cursorY, { align: "center", baseline: "top" });
      cursorY += 30;

      // Decorative line
      pdf.setDrawColor(100, 100, 150);
      pdf.setLineWidth(0.5);
      pdf.line(pageWidth / 2 - 60, cursorY, pageWidth / 2 + 60, cursorY);

      // ========== CONTENT PAGES ==========
      pdf.addPage();
      cursorY = marginY;

      // Light background for content
      pdf.setFillColor(252, 252, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      // Parse story into segments
      const segmentsByParagraph = story
        .replace(/\r/g, "")
        .split(/\n\s*\n/)
        .map((para) => para.trim())
        .filter(Boolean)
        .map((para) => parseSegments(para));

      // Story header on content page
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(30, 30, 60);
      pdf.text("Your Story", marginX, cursorY, { baseline: "top" });
      cursorY += 30;

      // Subtle divider
      pdf.setDrawColor(200, 200, 220);
      pdf.setLineWidth(0.5);
      pdf.line(marginX, cursorY, marginX + 100, cursorY);
      cursorY += 20;

      // Body text settings
      pdf.setFontSize(12);
      pdf.setTextColor(40, 40, 50);

      const ensureSpace = (additional: number) => {
        if (cursorY + additional > pageHeight - marginY) {
          pdf.addPage();
          // Light background for new page
          pdf.setFillColor(252, 252, 255);
          pdf.rect(0, 0, pageWidth, pageHeight, "F");
          cursorY = marginY;
          pdf.setFontSize(12);
          pdf.setTextColor(40, 40, 50);
        }
      };

      const writeParagraph = (segments: TextSegment[]) => {
        let cursorX = marginX;
        ensureSpace(lineHeight);

        segments.forEach((segment) => {
          const words = segment.text.split(/\s+/).filter(Boolean);
          if (words.length === 0) return;

          pdf.setFont("helvetica", segment.bold ? "bold" : "normal");

          words.forEach((word) => {
            const spacer = cursorX === marginX ? "" : " ";
            const textToRender = `${spacer}${word}`;
            const textWidth = pdf.getTextWidth(textToRender);

            if (cursorX + textWidth > marginX + maxWidth) {
              cursorY += lineHeight;
              ensureSpace(lineHeight);
              cursorX = marginX;
            }

            pdf.text(textToRender, cursorX, cursorY, { baseline: "top" });
            cursorX += textWidth;
          });
        });

        cursorY += lineHeight;
      };

      segmentsByParagraph.forEach((segments, idx) => {
        writeParagraph(segments);
        if (idx < segmentsByParagraph.length - 1) {
          cursorY += 10; // Paragraph spacing
        }
      });

      // Footer on last page
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 170);
      pdf.text(
        "Generated with OneLine • Your personal diary companion",
        pageWidth / 2,
        pageHeight - 30,
        { align: "center", baseline: "top" }
      );

      pdf.save("oneline-story.pdf");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Export failed. Please retry after allowing downloads.");
    }
  }, [from, imageData, story, to]);

  useEffect(() => {
    const signature = JSON.stringify({
      options: initialOptions ?? null,
      preset: initialPreset ?? null,
      range: initialRange ?? null,
    });

    if (propsSignature.current === signature) {
      return;
    }

    propsSignature.current = signature;

    if (initialOptions) {
      setLength(initialOptions.length);
      setTone(initialOptions.tone);
      setPov(initialOptions.pov);
      // Highlights are always on now; keep the saved preference for payload completeness.
      setNotes(initialOptions.notes ?? "");
      setLanguage(initialOptions.language ?? "en");
      // Default to true if not present in initialOptions (backward compatibility)
      setIncludeImage(true);
      setIncludeAudio(true);
    } else {
      setLength("medium");
      setTone("auto");
      setPov("auto");
      setNotes("");
      setLanguage("en");
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
      const json = (await res.json()) as Quota;
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

  useEffect(() => {
    if (!loading) {
      setLoadingPhrase(null);
      return;
    }

    let index = Math.floor(Math.random() * loadingPhrases.length);
    setLoadingPhrase(loadingPhrases[index]);

    const timer = setInterval(() => {
      index = (index + 1) % loadingPhrases.length;
      setLoadingPhrase(loadingPhrases[index]);
    }, 2200);

    return () => clearInterval(timer);
  }, [loading, loadingPhrases]);

  function openConsent() {
    setModalError(null);
    setModalPassphrase("");
    setConsentChecked(false);
    setShowConsent(true);
  }

  async function performGeneration(key: CryptoKey) {
    try {
      setLoading(true);
      setError(null);
      setStory("");
      setLoadingPhrase(loadingPhrases[Math.floor(Math.random() * loadingPhrases.length)]);

      const params = new URLSearchParams({ from, to });
      const historyRes = await fetch(`/api/history?${params.toString()}`, { cache: "no-store" });
      if (historyRes.status === 401) {
        throw new Error("Please sign in to access your history.");
      }
      const historyJson = (await historyRes.json().catch(() => ({}))) as {
        entries?: EntryPayload[];
        error?: string;
      };
      if (historyJson.error) {
        throw new Error(historyJson.error);
      }
      const entries = historyJson.entries ?? [];
      if (entries.length === 0) {
        throw new Error("No entries available in that range.");
      }

      const decrypted: { content: string; created_at: string; day?: string | null }[] = [];
      for (const entry of entries) {
        if (entry.content_cipher && entry.iv) {
          try {
            const text = await decryptText(key, entry.content_cipher, entry.iv);
            if (text.trim()) {
              decrypted.push({ content: text, created_at: entry.created_at, day: entry.day });
            }
          } catch {
            throw new Error("Unable to decrypt some entries. Unlock with the correct passphrase.");
          }
        } else if (entry.content) {
          decrypted.push({ content: entry.content, created_at: entry.created_at, day: entry.day });
        }
      }

      if (decrypted.length === 0) {
        throw new Error("No decryptable entries in that range.");
      }

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
        const plural = remainingDays === 1 ? "day" : "days";
        throw new Error(
          `${WEEKLY_GUARD_BASE} You have ${uniqueDays.size}/${WEEKLY_MINIMUM_DAYS} days — ${remainingDays} more ${plural} to go.`,
        );
      }

      const payload = {
        consent: true,
        from,
        to,
        mode,
        options: {
          length,
          tone,
          pov,
          includeHighlights,
          notes: notes.trim() || undefined,
          language,
          includeImage,
          includeAudio,
        },
        entries: decrypted,
      };

      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as
        | { story?: string; audioBase64?: string; audioMimeType?: string; imageBase64?: string; error?: string; message?: string; usageUnits?: number; remainingUnits?: number; dailyLimit?: number }
        | null;
      if (!res.ok) {
        const message = json?.message || json?.error || res.statusText || "Failed to generate story";
        setUsageInfo((current) =>
          json?.usageUnits != null && json?.remainingUnits != null && json?.dailyLimit != null
            ? {
              mode,
              usageUnits: json.usageUnits,
              remainingUnits: json.remainingUnits,
              dailyLimit: json.dailyLimit,
            }
            : current,
        );
        throw new Error(message);
      }

      const storyText = json?.story || "";
      setStory(storyText);

      // Set audio and image if available
      if (json?.audioBase64) {
        const mime = json.audioMimeType || 'audio/mp3';
        console.log("Audio received:", mime, "Length:", json.audioBase64.length);

        // Handle raw PCM (L16) by converting to WAV
        if (mime.toLowerCase().includes('l16') || mime.toLowerCase().includes('pcm')) {
          try {
            const binaryString = window.atob(json.audioBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            // Parse sample rate from mime type or default to 24000
            const rateMatch = mime.match(/rate=(\d+)/);
            const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

            const wavBytes = addWavHeader(bytes, sampleRate, 1); // Mono
            const blob = new Blob([wavBytes as any], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setAudioMimeType('audio/wav'); // Treat as wav for download
          } catch (e) {
            console.error("Error converting PCM to WAV:", e);
            // Fallback to raw data if conversion fails
            setAudioUrl(`data:${mime};base64,${json.audioBase64}`);
            setAudioMimeType(mime);
          }
        } else {
          setAudioUrl(`data:${mime};base64,${json.audioBase64}`);
          setAudioMimeType(mime);
        }
      }
      if (json?.imageBase64) setImageData(json.imageBase64);

      if (json?.usageUnits != null && json?.remainingUnits != null && json?.dailyLimit != null) {
        setUsageInfo({
          mode,
          usageUnits: json.usageUnits,
          remainingUnits: json.remainingUnits,
          dailyLimit: json.dailyLimit,
        });
      }
      refreshQuota();

      try {
        const supabase = supabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const uid = user?.id;
        if (uid && key && storyText) {
          await persistSummary(uid, key, storyText, { from, to, period: inferPeriod(from, to) });
        }
      } catch {
        // Best-effort persistence only; rendering still succeeds without local history.
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
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
      {/* Controles */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/60 to-indigo-900/20 p-5 shadow-2xl shadow-indigo-950/40">
        <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Quota</p>
            {quotaLoading ? (
              <p className="text-sm text-zinc-300">Checking allowance…</p>
            ) : quotaError ? (
              <p className="text-sm text-rose-400">{quotaError}</p>
            ) : quota ? (
              <p className="text-sm text-zinc-100">
                {quota.unlimited ? (
                  <span className="font-semibold">Unlimited stories enabled for this account</span>
                ) : (
                  <>
                    <span className="font-semibold">{quota.remaining}</span> of {quota.limit} stories left
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-zinc-300">Sign in to see your allowance.</p>
            )}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{
                  width: quota
                    ? quota.unlimited
                      ? "100%"
                      : `${Math.min(100, (quota.used / quota.limit) * 100)}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              {quota
                ? quota.unlimited
                  ? "Unlimited allowance active"
                  : `Resets ${new Date(quota.resetAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : "Refresh to update"}
            </p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Voice</p>
            <p className="text-sm text-zinc-100">Keeps your languages, tone, and highlights intact.</p>
            <p className="text-[11px] text-zinc-500">Gemini prompt preserves code-switching automatically.</p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/5 bg-white/5 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Privacy</p>
            <p className="text-sm text-zinc-100">Vault stays client-side until you consent to send.</p>
            <p className="text-[11px] text-zinc-500">We never store your passphrase.</p>
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Model</p>
            <p className="text-sm text-zinc-100">Pick the engine for this summary.</p>
            <p className="text-[11px] text-zinc-500">Advanced uses two daily units; standard uses one.</p>
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            {(
              [
                {
                  key: "standard",
                  label: "Fast (best for most days)",
                  desc: "Responsive and balanced · 1 unit",
                },
                {
                  key: "advanced",
                  label: "Our most advanced",
                  desc: "Richer depth and nuance · 2 units",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMode(option.key)}
                className={`flex min-w-[180px] flex-col gap-1 rounded-xl border px-3 py-2 text-left shadow-sm transition ${mode === option.key
                  ? "border-indigo-400 bg-indigo-500/20 text-white"
                  : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/30 hover:bg-white/10"
                  }`}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-zinc-400">{option.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Preset */}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Period</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as Preset)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="30">Last 30 days</option>
              <option value="lastWeek">Last week (Mon–Sun)</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="year">Year to date</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          {/* Custom dates */}
          {preset === "custom" && (
            <>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-400">From</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm text-zinc-400">To</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </>
          )}

          {/* Length */}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-400">Length</span>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as Length)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
            <span className="text-xs text-zinc-500">{lengthGuidance[length]}</span>
          </label>

          {/* Tone */}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Tone</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="auto">Auto</option>
              <option value="warm">Warm</option>
              <option value="neutral">Neutral</option>
              <option value="poetic">Poetic</option>
              <option value="direct">Direct</option>
            </select>
          </label>

          {/* POV */}
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Point of view</span>
            <select
              value={pov}
              onChange={(e) => setPov(e.target.value as Pov)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="auto">Auto</option>
              <option value="first">First person</option>
              <option value="third">Third person</option>
            </select>
          </label>

          {/* Highlights */}
          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 px-3 py-3 text-sm text-zinc-200">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Highlights included automatically</span>
            </div>
            <span className="text-xs text-zinc-500">Your story ends with the biggest wins and low points by default.</span>
          </div>

          {/* Multimedia Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-zinc-400">Multimedia</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm text-zinc-200">Generate Cover Image</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:bg-zinc-800 transition-colors">
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                />
                <span className="text-sm text-zinc-200">Generate Audio Narration</span>
              </label>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-zinc-400">Notes to the writer (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any nuance you want the story to consider…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        {/* Action */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={openConsent}
            disabled={loading}
            className="group relative overflow-hidden rounded-xl bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 via-sky-500 to-purple-500 opacity-0 blur transition duration-500 group-hover:opacity-60" />
            {loading ? "Generating…" : "Generate your story"}
          </button>
          {error && <span className="text-sm text-rose-400">{error}</span>}
          {error?.startsWith(WEEKLY_GUARD_BASE) && (
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-1 text-sm font-medium text-indigo-100 transition hover:border-white/30 hover:bg-white/5"
              onClick={() => {
                setAllowShortRangeOverride(true);
                setError(null);
                openConsent();
              }}
            >
              Generate anyway
            </button>
          )}
          {usageInfo && (
            <span className="text-sm text-zinc-400">
              Used {usageInfo.usageUnits} of {usageInfo.dailyLimit} units today ({usageInfo.remainingUnits} left) · Last run: {" "}
              <span className="font-semibold text-indigo-100">{usageInfo.mode}</span>
            </span>
          )}
        </div>
      </div>

      {/* Resultado */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/50 p-5 shadow-2xl shadow-indigo-950/40" aria-busy={loading}>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5" />
        {loading && (
          <div className="relative space-y-3">
            <div className="flex items-center gap-2 text-sm text-indigo-100">
              <div className="h-2.5 w-2.5 animate-ping rounded-full bg-indigo-400" />
              <span className="font-medium">Crafting your story…</span>
            </div>
            <p className="text-sm text-zinc-400">{loadingPhrase || "Holding your voice steady while we assemble this recap."}</p>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-11/12 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-10/12 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        )}

        {!loading && story && (
          <article className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-indigo-900/20 to-purple-900/10 p-5 shadow-xl shadow-indigo-950/40">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_26%)]" />
            <div className="relative mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">
                <span className="h-[2px] w-6 rounded-full bg-indigo-400" />
                <span>Your story</span>
              </div>
              <button
                type="button"
                onClick={exportStoryAsPdf}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-indigo-50 shadow-sm transition hover:border-white/30 hover:bg-white/10"
              >
                Export as PDF
              </button>
            </div>

            {(imageData || audioUrl) && (
              <div className="mb-8 grid gap-6 sm:grid-cols-2">
                {imageData && (
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl transition hover:border-white/20">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                    <img src={`data:image/png;base64,${imageData}`} alt="Story Cover" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Generated Cover</p>
                      <a
                        href={`data:image/png;base64,${imageData}`}
                        download="story-cover.png"
                        className="rounded-full bg-white/10 p-2 text-white backdrop-blur-md transition hover:bg-white/20"
                        title="Download Cover"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )}
                {audioUrl && (
                  <div className="flex flex-col justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 backdrop-blur-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V9.017 5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.658.122z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Audio Story</p>
                        <p className="text-xs text-zinc-400">Read by Gemini</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <audio controls src={audioUrl} className="w-full accent-indigo-500" />
                      <a
                        href={audioUrl}
                        download={`story-audio.${audioMimeType.includes('wav') ? 'wav' : audioMimeType.split('/')[1] || 'mp3'}`}
                        className="text-center text-xs text-indigo-300 hover:text-indigo-200 hover:underline"
                      >
                        Download Audio File
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}


            <div className="relative space-y-3 font-serif text-[17px] leading-relaxed text-zinc-50">
              {formattedStory.map((block, idx) => (
                <p
                  key={idx}
                  className="rounded-xl bg-white/5 px-4 py-3 text-[16px] leading-[1.6] shadow-inner shadow-black/10 ring-1 ring-white/5"
                >
                  <span dangerouslySetInnerHTML={{ __html: block }} />
                </p>
              ))}
            </div>
          </article>
        )}

        {!loading && !story && (
          <p className="relative text-zinc-400">Your story will appear here.</p>
        )}
      </div>

      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-950 p-6 text-zinc-100 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Share decrypted entries with Gemini</h3>
            <p className="mt-2 text-sm text-zinc-400">
              To generate this story we will send your decrypted journal lines to our backend and to Google Gemini. Nothing is stored once the story is produced.
            </p>

            <label className="mt-4 flex items-start gap-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-neutral-900 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
              <span>I consent to send my decrypted entries to Gemini for this request.</span>
            </label>

            {!dataKey && (
              <div className="mt-4">
                <label className="flex flex-col gap-2 text-sm text-zinc-300">
                  <span>Passphrase</span>
                  <input
                    type="password"
                    value={modalPassphrase}
                    onChange={(e) => setModalPassphrase(e.target.value)}
                    className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="Unlock your vault"
                  />
                </label>
              </div>
            )}

            {modalError && <p className="mt-4 text-sm text-rose-400">{modalError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConsent(false);
                  setModalBusy(false);
                  setModalPassphrase("");
                }}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-sm text-zinc-200 hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmConsent}
                disabled={modalBusy}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {modalBusy ? 'Preparing…' : 'Confirm & generate'}
              </button>
            </div>

            <p className="mt-4 text-xs text-zinc-500">
              SECURITY: This action temporarily exposes your decrypted text to our server and Gemini. We never store your passphrase, and losing it means we cannot recover your data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
