// src/components/SiteFooter.tsx
export default function SiteFooter() {
  return (
    <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-zinc-400">
      <div className="flex flex-wrap items-center gap-4">
        <a className="hover:text-zinc-200" href="/privacy">Privacy</a>
        <a className="hover:text-zinc-200" href="/terms">Terms</a>
        <a className="hover:text-zinc-200" href="/cookies">Cookies</a>
      </div>
      <p className="mt-2 opacity-70">© {new Date().getFullYear()} OneLine</p>
    </footer>
  );
}