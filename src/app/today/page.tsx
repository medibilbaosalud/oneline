import TodayClient from './TodayClient';

export const metadata = { title: 'Today — OneLine' };

export default function TodayPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-neutral-400">Today</p>
          <h1 className="mt-1 text-3xl font-semibold">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </h1>
        </header>
        <TodayClient />
      </div>
    </main>
  );
}