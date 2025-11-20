// src/app/summaries/StoryGenerator.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import type { SummaryLanguage, SummaryPreferences } from "@/lib/summaryPreferences";

const WEEKLY_GUARD_MESSAGE = "Write at least four days to unlock your first weekly story.";

type Length = "short" | "medium" | "long";
type Tone = "auto" | "warm" | "neutral" | "poetic" | "direct";
type Pov = "auto" | "first" | "third";
type Preset = "30" | "90" | "180" | "year" | "lastWeek" | "custom";

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

function startOfYear(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
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

function patchHtml2CanvasColorParser(html2canvas: any) {
  const Color = html2canvas?.Color;
  if (!Color || typeof Color.fromString !== "function") return;

  // Avoid double patching
  if ((Color as any).__patchedForLab === true) return;

  const base = Color.fromString.bind(Color);

  Color.fromString = (input: string) => {
    const value = input?.trim().toLowerCase();

    if (!value) return base(input);

    // html2canvas doesn't understand modern color functions like lab()/oklab()/lch()/color().
    const isUnsupported =
      value.startsWith("lab(") || value.startsWith("oklab(") || value.startsWith("lch(") || value.startsWith("color(");

    if (!isUnsupported) {
      return base(input);
    }

    // Try letting the browser resolve the value and fall back to a neutral gray if it still fails.
    try {
      const tmp = document.createElement("span");
      tmp.style.color = input;
      if (tmp.style.color) {
        return base(tmp.style.color);
      }
    } catch (err) {
      console.warn("Color normalization failed", err);
    }

    return base("#111827");
  };

  (Color as any).__patchedForLab = true;
}

type StyledSegment = { text: string; bold: boolean };

function toStyledSegments(html: string): StyledSegment[] {
  if (typeof window === "undefined") {
    return [{ text: html.replace(/<[^>]+>/g, " "), bold: false }];
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const segments: StyledSegment[] = [];

  const walk = (node: Node, bold: boolean) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").replace(/\s+/g, " ");
      if (text.trim()) {
        segments.push({ text, bold });
      }
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const nextBold = bold || ["B", "STRONG", "H1", "H2", "H3"].includes(node.tagName);

    if (node.tagName === "BR") {
      segments.push({ text: "\n", bold });
      return;
    }

    if (node.tagName === "LI") {
      segments.push({ text: "• ", bold: nextBold });
      node.childNodes.forEach((child) => walk(child, nextBold));
      segments.push({ text: "\n", bold });
      return;
    }

    node.childNodes.forEach((child) => walk(child, nextBold));
  };

  doc.body.childNodes.forEach((child) => walk(child, false));
  return segments.length ? segments : [{ text: doc.body.textContent || "", bold: false }];
}

function wrapSegments(segments: StyledSegment[], maxWidth: number, measure: (text: string, bold: boolean) => number) {
  const lines: StyledSegment[][] = [[]];
  let currentWidth = 0;

  segments.forEach((segment) => {
    const parts = segment.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (part === "") return;

      if (part === "\n") {
        if (lines[lines.length - 1].length) {
          lines.push([]);
        }
        currentWidth = 0;
        return;
      }

      const width = measure(part, segment.bold);
      if (currentWidth + width > maxWidth && lines[lines.length - 1].length) {
        lines.push([]);
        currentWidth = 0;
      }

      lines[lines.length - 1].push({ text: part, bold: segment.bold });
      currentWidth += width;
    });
  });

  return lines.filter((line) => line.length);
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
  const includeHighlights = true;
  const [notes, setNotes] = useState(initialOptions?.notes ?? "");
  const [language, setLanguage] = useState<SummaryLanguage>(initialOptions?.language ?? "en");

  // Result
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<string>("");
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

    let exportRoot: HTMLDivElement | null = null;

    try {
      await loadScriptWithFallback([
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
      ]);
      await loadScriptWithFallback([
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      ]);

      const { jsPDF } = (window as any).jspdf || {};
      const html2canvas = (window as any).html2canvas as
        | ((element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>)
        | undefined;

      if (!jsPDF || !html2canvas) {
        throw new Error("PDF tools unavailable");
      }

      patchHtml2CanvasColorParser((window as any).html2canvas);

      exportRoot = document.createElement("div");
      exportRoot.id = "oneline-story-export-root";
      exportRoot.style.position = "fixed";
      exportRoot.style.inset = "0";
      exportRoot.style.padding = "48px";
      exportRoot.style.background = "linear-gradient(135deg, #0b1021, #101826)";
      exportRoot.style.zIndex = "-1";
      exportRoot.style.pointerEvents = "none";
      exportRoot.style.opacity = "0";

      const card = document.createElement("div");
      card.style.maxWidth = "880px";
      card.style.margin = "0 auto";
      card.style.padding = "40px";
      card.style.borderRadius = "28px";
      card.style.background = "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(243,244,255,0.96))";
      card.style.boxShadow = "0 24px 80px rgba(0,0,0,0.22)";
      card.style.border = "1px solid rgba(99,102,241,0.2)";
      card.style.fontFamily = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
      card.style.color = "#0b0b15";

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.justifyContent = "space-between";
      topRow.style.alignItems = "center";
      topRow.style.marginBottom = "14px";

      const brand = document.createElement("div");
      brand.style.display = "inline-flex";
      brand.style.alignItems = "center";
      brand.style.gap = "10px";
      brand.style.letterSpacing = "0.14em";
      brand.style.fontSize = "12px";
      brand.style.fontWeight = "800";
      brand.style.textTransform = "uppercase";
      brand.style.color = "#111827";
      brand.innerHTML =
        '<span style="display:inline-block;width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#ec4899);box-shadow:0 10px 30px rgba(99,102,241,0.35);"></span><span>OneLine</span>';

      const eyebrow = document.createElement("div");
      eyebrow.style.display = "inline-flex";
      eyebrow.style.alignItems = "center";
      eyebrow.style.gap = "10px";
      eyebrow.style.letterSpacing = "0.22em";
      eyebrow.style.fontSize = "11px";
      eyebrow.style.fontWeight = "800";
      eyebrow.style.textTransform = "uppercase";
      eyebrow.style.color = "#4338ca";
      eyebrow.innerHTML = '<span style="display:inline-block;width:44px;height:3px;border-radius:999px;background:linear-gradient(90deg,#6366f1,#ec4899);"></span> Your story';

      const title = document.createElement("h1");
      title.textContent = "Personal recap";
      title.style.margin = "14px 0 14px";
      title.style.fontSize = "30px";
      title.style.fontWeight = "800";
      title.style.letterSpacing = "-0.01em";

      const subtitle = document.createElement("p");
      subtitle.textContent = "A polished export of your narrative — ready to share or archive.";
      subtitle.style.margin = "0 0 18px";
      subtitle.style.color = "#4b5563";
      subtitle.style.fontSize = "15px";
      subtitle.style.fontWeight = "600";

      const body = document.createElement("div");
      body.style.display = "grid";
      body.style.gap = "12px";

      const blocks = formattedStory.length ? formattedStory : formatStoryBlocks(story);

      const measure = (() => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        return (text: string, bold: boolean) => {
          if (!ctx) return text.length * 7;
          ctx.font = `${bold ? "700" : "500"} 15px 'Inter', 'Helvetica', sans-serif`;
          return ctx.measureText(text).width;
        };
      })();

      blocks.forEach((block) => {
        const paragraph = document.createElement("div");
        paragraph.style.padding = "16px 18px";
        paragraph.style.borderRadius = "18px";
        paragraph.style.background = "linear-gradient(180deg, rgba(99,102,241,0.08), rgba(15,23,42,0.04))";
        paragraph.style.border = "1px solid rgba(99,102,241,0.14)";
        paragraph.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.5)";
        paragraph.style.fontFamily = "'Cormorant Garamond', 'Times New Roman', serif";
        paragraph.style.fontSize = "18px";
        paragraph.style.lineHeight = "1.62";
        paragraph.style.color = "#0b0b15";

        const lines = wrapSegments(toStyledSegments(block), 720, measure);
        lines.forEach((line) => {
          const lineEl = document.createElement("p");
          lineEl.style.margin = "0";
          lineEl.style.display = "block";
          lineEl.style.lineHeight = "1.62";

          line.forEach((segment) => {
            const span = document.createElement("span");
            span.textContent = segment.text;
            span.style.fontWeight = segment.bold ? "700" : "500";
            span.style.whiteSpace = "pre-wrap";
            lineEl.appendChild(span);
          });

          paragraph.appendChild(lineEl);
        });

        body.appendChild(paragraph);
      });

      topRow.appendChild(brand);
      topRow.appendChild(eyebrow);

      card.appendChild(topRow);
      card.appendChild(title);
      card.appendChild(subtitle);
      card.appendChild(body);
      exportRoot.appendChild(card);
      document.body.appendChild(exportRoot);

      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const canvas = await html2canvas(exportRoot, {
        scale: 2,
        backgroundColor: "#0b1021",
        onclone: (doc: Document) => {
          doc.querySelectorAll("link[rel='stylesheet'], style").forEach((node) => {
            // Remove global styles that may include modern color() definitions unsupported by html2canvas.
            node.parentNode?.removeChild(node);
          });

          const clonedRoot = doc.getElementById("oneline-story-export-root");
          if (clonedRoot) {
            // Ensure the cloned export root keeps its inline styling without inherited CSS.
            clonedRoot.setAttribute("style", exportRoot?.getAttribute("style") || "");
          }
        },
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pdfHeight;
      }

      pdf.save("oneline-story.pdf");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Export failed. Please retry after allowing downloads.");
    } finally {
      if (exportRoot?.parentNode) {
        document.body.removeChild(exportRoot);
      }
    }
  }, [formattedStory, story]);

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
    } else {
      setLength("medium");
      setTone("auto");
      setPov("auto");
      setNotes("");
      setLanguage("en");
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
      if (diffDays <= 8 && decrypted.length < 4 && !allowShortRangeOverride) {
        throw new Error(WEEKLY_GUARD_MESSAGE);
      }

      const payload = {
        consent: true,
        from,
        to,
        options: {
          length,
          tone,
          pov,
          includeHighlights,
          notes: notes.trim() || undefined,
          language,
        },
        entries: decrypted,
      };

      const res = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as { story?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(json?.error || res.statusText || "Failed to generate story");
      }

      setStory(json?.story || "");
      refreshQuota();
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
          {error === WEEKLY_GUARD_MESSAGE && (
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