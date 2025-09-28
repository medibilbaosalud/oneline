export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-semibold">OneLine — Bootstrap OK ✅</h1>
        <p className="text-sm opacity-70">
          Si ves fondo oscuro y texto claro, Tailwind está funcionando.
        </p>
        <nav className="flex gap-3 text-sm">
          <a className="underline underline-offset-4" href="/(auth)/login">/login</a>
          <a className="underline underline-offset-4" href="/today">/today</a>
          <a className="underline underline-offset-4" href="/history">/history</a>
        </nav>
      </div>
    </main>
  );
}
