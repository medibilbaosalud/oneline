import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import EntryCard from "./EntryCard";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="text-zinc-300 p-6">Please sign in</div>;

  const { data } = await supabase
    .from("journal")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-zinc-100">History</h1>
        <p className="mt-1 text-zinc-400">Your past entries.</p>

        <section
          className="
            mt-8 grid gap-6
            sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
            auto-rows-[minmax(240px,1fr)]
          "
        >
          {data?.map((e) => <EntryCard key={e.id} entry={e as any} />)}
        </section>
      </div>
    </main>
  );
}