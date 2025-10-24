import { Suspense } from 'react';
import AuthPageClient from './AuthPageClient';

function AuthPageFallback() {
  return (
    <main className="min-h-[calc(100vh-56px)] bg-neutral-950 text-zinc-100">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-6 py-12 lg:grid-cols-2">
        <section className="order-2 lg:order-1">
          <div className="h-10 w-3/4 rounded-lg bg-white/10" />
          <div className="mt-4 h-24 w-full rounded-lg bg-white/5" />
        </section>
        <section className="order-1 lg:order-2">
          <div className="h-full min-h-[380px] rounded-2xl border border-white/10 bg-white/5" />
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageClient />
    </Suspense>
  );
}
