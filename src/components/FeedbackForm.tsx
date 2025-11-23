"use client";

import { FormEvent, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type FeedbackType = "bug" | "suggestion" | "other";

const feedbackOptions: { value: FeedbackType; label: string; helper: string }[] = [
  { value: "bug", label: "Bug / problem", helper: "Something broken or glitchy" },
  { value: "suggestion", label: "Suggestion", helper: "Ideas to improve OneLine" },
  { value: "other", label: "Other", helper: "General thoughts or questions" },
];

export default function FeedbackForm({
  defaultPage,
  className,
  id,
}: {
  defaultPage?: string;
  className?: string;
  id?: string;
}) {
  const pathname = usePathname();
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const page = useMemo(() => defaultPage ?? pathname ?? "", [defaultPage, pathname]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 6) {
      setErrorMessage("Please add a few more details before sending.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: trimmed, page }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(payload?.message ?? "We couldn’t send that right now. Please try again.");
        return;
      }

      setMessage("");
      setSuccessMessage("Thanks for your feedback! We appreciate you taking the time.");
    } catch (error) {
      setErrorMessage("We couldn’t send that right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id={id}
      className={`overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-xl shadow-indigo-950/20 ${
        className ?? ""
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Feedback</p>
          <h2 className="text-xl font-semibold text-white">Found a bug or have an idea?</h2>
          <p className="text-sm text-zinc-300">
            Tell us what’s working, what’s not, or what you’d love to see next. No login required.
          </p>
        </div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-indigo-100">Encrypted app, honest feedback</div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {feedbackOptions.map((option) => {
            const active = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={`rounded-xl border px-3 py-3 text-left transition ${
                  active
                    ? "border-indigo-400/70 bg-indigo-500/15 text-white shadow-lg shadow-indigo-900/30"
                    : "border-white/10 bg-black/30 text-zinc-200 hover:border-white/30 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-[11px] uppercase tracking-wide text-indigo-100/80">
                    {active ? "Selected" : "Choose"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-300">{option.helper}</p>
              </button>
            );
          })}
        </div>

        <div>
          <label className="text-sm font-medium text-white">Message</label>
          <p className="text-xs text-zinc-300">Share as much context as you want. Screenshots and steps help a ton.</p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            required
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white shadow-inner shadow-black/30 focus:border-indigo-400/70 focus:outline-none"
            placeholder="Describe the bug, suggestion, or feedback..."
          />
        </div>

        {successMessage && (
          <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-50">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-300">
            We read every note. If you’re logged in, we’ll link it to your account so we can follow up.
          </p>
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </form>
    </section>
  );
}
