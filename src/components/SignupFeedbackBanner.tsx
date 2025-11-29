"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const toneStyles = {
  success: {
    wrapper: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    icon: "text-emerald-300",
  },
  error: {
    wrapper: "border-rose-400/40 bg-rose-500/10 text-rose-200",
    icon: "text-rose-300",
  },
} as const;

type SignupStatus = "ok" | "error" | "missing";

type Props = {
  status?: SignupStatus;
};

export function SignupFeedbackBanner({ status }: Props) {
  const [open, setOpen] = useState(Boolean(status));
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const tone = status === "ok" ? "success" : "error";

  const message = useMemo(() => {
    if (status === "ok") return "Account created.";
    if (status === "error") return "We couldn’t finish creating your account. Please sign in and try again.";
    if (status === "missing") return "The sign-up link is missing or expired. Please sign in again.";
    return null;
  }, [status]);

  if (!status || !open || !message) return null;

  const styles = toneStyles[tone];

  function handleDismiss() {
    setOpen(false);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("signup");
    startTransition(() => {
      router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative mb-4 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-black/20 transition ${styles.wrapper}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 text-lg ${styles.icon}`} aria-hidden="true">
          {tone === "success" ? "✔" : "⚠"}
        </span>
        <p>{message}</p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-inherit transition hover:border-white/20 hover:bg-white/5 disabled:opacity-60"
        aria-label="Dismiss notification"
      >
        Close
      </button>
    </div>
  );
}
