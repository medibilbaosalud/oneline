// src/app/history/page.tsx
import { getJournalTable } from "@/lib/getJournalTable";
import { supabaseServer } from "@/lib/supabaseServer";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "History — OneLine",
};

export default async function HistoryPage() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  let entries:
    | { id: string; content: string; created_at: string }[]
    | undefined = [];

  if (user) {
    const table = getJournalTable();
    const { data } = await sb
      .from(table)
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    entries = data ?? [];
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-zinc-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-semibold">History</h1>

        {entries && entries.length > 0 ? (
          <HistoryClient initialEntries={entries} />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
            <p className="text-zinc-400">No entries yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}