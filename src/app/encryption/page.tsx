import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How OneLine encryption works",
  description:
    "Learn how OneLine keeps your entries private with client-side passphrase encryption, Supabase storage, and zero-knowledge handling.",
};

export default function EncryptionExplainerPage() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#050507] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[#03030a]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(129,140,248,0.26),transparent_42%),radial-gradient(circle_at_82%_12%,rgba(236,72,153,0.18),transparent_36%),radial-gradient(circle_at_50%_70%,rgba(45,212,191,0.18),transparent_48%)]"
        aria-hidden
      />
      <main className="relative mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-20">
        <header className="space-y-4 text-pretty text-center md:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.32em] text-indigo-200/80">
            End-to-end by design
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            Learn how OneLine keeps your words private
          </h1>
          <p className="text-base leading-relaxed text-zinc-300 md:text-lg">
            Everything you write encrypts in your browser using a key derived from your passphrase. We never store or see that passphrase. If a passphrase is wrong, we only discover it because the ciphertext fails to decrypt. Servers merely hold encrypted blobs in Supabase until your vault is unlocked again.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            <Link
              href="/today"
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:to-fuchsia-400"
            >
              Start now — go to Today
            </Link>
            <Link
              href="/visitor"
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/25 hover:bg-white/10"
            >
              Try visitor mode
            </Link>
          </div>
        </header>

        <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-neutral-950/80 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">The path of your data</h2>
            <ul className="space-y-3 text-sm leading-relaxed text-zinc-300 md:text-base">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <span>
                  <strong>On-device first:</strong> Your browser derives an AES-256 key from your passphrase using PBKDF2. That key never leaves your device.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
                <span>
                  <strong>Encrypted transit & storage:</strong> Entries are encrypted with AES-GCM before they leave your device, then stored as ciphertext in Supabase. We do not keep a copy of your passphrase.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" />
                <span>
                  <strong>Vault locked by default:</strong> Without the correct passphrase, decryption fails and the vault stays shut. The only signal we see is a decryption error.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                <span>
                  <strong>Backed by Supabase:</strong> All encrypted rows live in Supabase’s managed Postgres. You can export or delete them anytime to meet EU data rights.
                </span>
              </li>
            </ul>
            <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-4 text-sm text-zinc-200 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
              <p className="font-semibold text-white">What servers see</p>
              <pre className="mt-3 overflow-auto rounded-xl bg-black/60 p-4 text-[11px] text-emerald-200">{`{
  "content_cipher": "b64...",
  "iv": "b64...",
  "created_at": "2024-10-14T21:10:00Z"
}`}</pre>
              <p className="mt-3 text-xs text-zinc-400">No plaintext is stored or logged. Your passphrase is never transmitted.</p>
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6 shadow-[0_22px_70px_rgba(0,0,0,0.45)] backdrop-blur-lg">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">Decryption flow</p>
              <h3 className="mt-2 text-lg font-semibold text-white">When you return to read</h3>
              <ol className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-300">
                <li><strong>Unlock locally:</strong> Enter your passphrase; the key is derived again in your browser.</li>
                <li><strong>Decrypt client-side:</strong> We pull ciphertext from Supabase and decrypt it locally. If the passphrase is wrong, AES-GCM fails and no text is shown.</li>
                <li><strong>Stay offline-friendly:</strong> If the data is cached, you can read locally until you sign out or clear storage.</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">Zero-knowledge stance</p>
              <h3 className="mt-2 text-lg font-semibold text-white">No passphrase retention</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                We cannot reset or recover your passphrase. Use a password manager if you need backup. Failed decryptions simply tell us the key is incorrect—nothing more.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">Where data lives</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Supabase hosting</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                Encrypted entries, IVs, and metadata are stored in Supabase (managed Postgres) within your configured region. Export and delete tools help you comply with EU and Spanish privacy requirements.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 rounded-3xl border border-white/10 bg-neutral-950/80 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-indigo-200/80">Science-backed storytelling</p>
            <h2 className="text-2xl font-semibold text-white">How your story is generated</h2>
            <p className="text-sm leading-relaxed text-zinc-300 md:text-base">
              When you request a story or reflection, your entries decrypt locally first. Only then does your browser send the freshly
              decrypted text to Gemini over TLS, along with the parameters needed for the narrative. The request originates from your
              device and Gemini sends the summary straight back to it—plaintext never touches OneLine servers.
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-200">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-indigo-200/80">
                <span>Plaintext journey</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80">
                  Device → Gemini → Device
                </span>
              </div>
              <ol className="mt-3 space-y-3">
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                  <span>
                    <strong>Decrypt only on your device:</strong> Your vault unlocks locally; plaintext exists only in browser memory while
                    composing the prompt.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" aria-hidden />
                  <span>
                    <strong>Send directly to Gemini:</strong> The decrypted snippet goes from your browser straight to Gemini over TLS—no
                    OneLine proxy, no intermediate storage.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" aria-hidden />
                  <span>
                    <strong>Receive and re-encrypt:</strong> Gemini replies to your device; if you save the story, it re-encrypts immediately
                    before syncing back to Supabase. No other system ever holds the decrypted output.
                  </span>
                </li>
              </ol>
            </div>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex gap-3 text-sm text-zinc-200">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                <span>
                  <strong>Local prep:</strong> You unlock the vault, the AES key is derived, and the selected entries decrypt in-memory.
                </span>
              </div>
              <div className="flex gap-3 text-sm text-zinc-200">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                <span>
                  <strong>Gemini request:</strong> Your browser calls Gemini directly with the decrypted snippet and receives a structured
                  response. We never proxy or log that payload.
                </span>
              </div>
              <div className="flex gap-3 text-sm text-zinc-200">
                <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" />
                <span>
                  <strong>Back to you:</strong> The generated story lands back on your device, where it can be saved (re-encrypted before
                  syncing) or discarded. No intermediate system ever stores the plaintext narrative.
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-6">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-200">
              <p className="text-xs uppercase tracking-[0.24em] text-indigo-200/80">Transparency snapshot</p>
              <p className="mt-2 text-base text-white">Where plaintext exists</p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                <li>
                  <strong>Only</strong> in your browser memory while the vault is open.
                </li>
                <li>
                  <strong>Temporarily</strong> inside Gemini&rsquo;s secure runtime to produce the response.
                </li>
                <li>
                  <strong>Never</strong> on OneLine servers or logs—saved stories are re-encrypted instantly before syncing to Supabase.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-200/80">What about Supabase?</p>
              <p className="mt-2 text-base font-semibold text-white">Encrypted vault storage</p>
              <p className="mt-2 text-sm leading-relaxed">
                Supabase only stores ciphertext rows plus metadata like IVs and timestamps. Gemini never writes to Supabase, and Supabase never
                receives plaintext. Export or delete the encrypted rows anytime to stay compliant with EU and Spanish privacy rules.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 rounded-3xl border border-white/10 bg-neutral-950/80 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3 text-pretty text-sm leading-relaxed text-zinc-300 md:text-base">
            <h2 className="text-2xl font-semibold text-white">Why this matters</h2>
            <p>
              OneLine is built for skeptics: private by architecture, transparent about storage, and upfront about trade-offs. Nothing meaningful can leak because plaintext never touches our servers.
            </p>
            <p>
              When you sign out or lock the vault, entries revert to ciphertext. When you sign back in, your device does the heavy lifting to decrypt them. If you ever want to double-check, use the encrypted view in History to see exactly what servers receive.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm text-zinc-200">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-indigo-200/80">
              <span>Quick links</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80">Client-side only</span>
            </div>
            <div className="space-y-3">
              <Link
                href="/history"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
              >
                View encrypted history toggle <span aria-hidden>→</span>
              </Link>
              <Link
                href="/today"
                className="flex items-center justify-between rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
              >
                Unlock vault and start writing <span aria-hidden>→</span>
              </Link>
              <Link
                href="/visitor"
                className="flex items-center justify-between rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 font-semibold text-white transition hover:border-indigo-300/60 hover:bg-indigo-500/20"
              >
                Try visitor mode (no storage) <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Questions? Reach out and we&rsquo;ll walk you through how encryption, Supabase storage, and consent-first summaries work together.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
