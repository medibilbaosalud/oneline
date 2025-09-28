"use client";
import useSWR from "swr";
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function HistoryPage() {
  const { data } = useSWR("/api/entries", fetcher);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl mb-4">Historial</h1>
      <ul className="space-y-2">
        {data?.items?.map((e: any) => (
          <li key={e.id} className="p-3 rounded bg-neutral-900">
            <div className="text-xs opacity-70">
              {e.entry_date} · slot {e.slot}
            </div>
            <div>{e.content}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
