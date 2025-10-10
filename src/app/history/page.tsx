// src/app/history/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import EntryItem from "./EntryItem";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string;
  content: string;
  created_at: string;
};

export default async function HistoryPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/history");

  const { data, error } = await supabase
    .from("journal")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold mb-6">History</h1>

      {error && <p className="text-red-400">{error.message}</p>}
      {!error && (!data || data.length === 0) && (
        <p className="text-zinc-400">No entries yet.</p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-4">
          {data.map((row: Row) => (
            <EntryItem key={row.id} id={row.id} content={row.content} created_at={row.created_at} />
          ))}
        </ul>
      )}
    </div>
  );
}