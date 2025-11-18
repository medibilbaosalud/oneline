import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encryption — OneLine",
  description:
    "How OneLine keeps your reflections end-to-end encrypted with a passphrase only you know.",
};

export default function EncryptionPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-zinc-100">
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.12),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-24">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200/80">End-to-end by design</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">
            Encryption that stays on your device.
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-zinc-300">
            Everything you write encrypts in your browser using a key derived from your passphrase. We never store or see that
            passphrase. If it&apos;s missing, you will only discover the ciphertext fails to decrypt. Servers merely hold encrypted
            copies until Supabase can unlock your vault.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/today"
              className="rounded-xl bg-gradient-to-r from-emerald-400/90 via-indigo-400/90 to-fuchsia-500/90 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-indigo-500/20 transition hover:from-emerald-300 hover:via-indigo-300 hover:to-fuchsia-400"
            >
              Start now — go to Today
            </Link>
            <Link
              href="/visitor"
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Try visitor mode
            </Link>
            <Link
              href="/signup"
              className="rounded-xl border border-white/10 bg-transparent px-6 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
            >
              Create my account
            </Link>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-14 md:grid-cols-2 md:py-20">
        <article className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-black/30 to-black/60 p-6 shadow-2xl shadow-emerald-500/10">
          <header className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-emerald-200/80">
            <span>The path of your data</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">AES-256</span>
          </header>
          <ul className="space-y-3 text-sm leading-relaxed text-zinc-200">
            <li>
              <strong>Device first:</strong> Your browser derives an AES-256 key from your passphrase using PBKDF2. The key never
              leaves your device.
            </li>
            <li>
              <strong>Encrypted transit + storage:</strong> Entries are encrypted with AES-GCM and stored as ciphertext. Supabase
              sees bytes, not meaning.
            </li>
            <li>
              <strong>Vault locked by default:</strong> Without the correct passphrase, the ciphertext cannot be decrypted — not
              by us, not by anyone else.
            </li>
          </ul>
        </article>

        <article className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-black/30 to-black/60 p-6 shadow-2xl shadow-indigo-500/10">
          <header className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-indigo-200/80">
            <span>When you return to read</span>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">Client-only</span>
          </header>
          <div className="space-y-3 text-sm leading-relaxed text-zinc-200">
            <p>
              Decrypt client-side from Supabase only after you supply the same passphrase. Reading, editing, and saving stay locked
              until your vault is open locally.
            </p>
            <p className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-emerald-200">
              No passphrase? No plaintext. That&apos;s the trade-off of true privacy.
            </p>
            <p className="text-xs text-zinc-400">
              Your encrypted data stays in EU regions. We keep it that way to respect privacy laws.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
