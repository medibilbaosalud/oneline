// src/app/history/page.tsx
import HistoryClient from "./HistoryClient";

export const metadata = {
  title: "History — OneLine",
};

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <h1 className="mb-6 text-4xl font-bold text-white">History</h1>
      <HistoryClient />
    </main>
  );
}