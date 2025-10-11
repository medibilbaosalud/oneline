import HistoryClient from './HistoryClient';

export const metadata = {
  title: 'History — OneLine'
};

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-4xl font-bold">History</h1>
        <p className="mt-1 text-sm text-neutral-400">Your past lines, newest first.</p>
        <div className="mt-6">
          <HistoryClient />
        </div>
      </div>
    </main>
  );
}