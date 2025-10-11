// src/app/history/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import HistoryClient from "./HistoryClient";

type Entry = {
  id: string;
  content: string;
  created_at: string;
};

export const metadata = {
  title: "History — OneLine",
};

export default async function HistoryPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let entries: Entry[] = [];
  if (user) {
    const { data } = await supabase
      .from("journal_entries")
      .select("id, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    entries = (data as Entry[]) || [];
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-4xl font-semibold">History</h1>
        <div className="mt-6">
          <HistoryClient initialEntries={entries} />
        </div>
      </div>
    </main>
  );
}