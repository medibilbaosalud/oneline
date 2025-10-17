// src/app/history/[day]/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export const dynamic = "force-dynamic";

type Props = { params: { day: string } };

export default async function EditDayPage({ params }: Props) {
  const day = params.day; // YYYY-MM-DD
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=/history/${day}`);

  const { data: entry, error } = await supabase
    .from("journal")
    .select("id, day, content")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Edit {day}</h1>
        <p className="text-rose-400">Error: {error.message}</p>
      </main>
    );
  }

  const content = entry?.content ?? "";

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Edit {day}</h1>

      <form
        className="space-y-4"
        action={`/api/journal/day/${day}`}
        method="post"
      >
        <textarea
          name="content"
          defaultValue={content}
          maxLength={300}
          className="h-56 w-full resize-none rounded-lg bg-neutral-900/70 p-4 outline-none ring-1 ring-white/10"
        />
        <div className="flex gap-3">
          <a
            href="/history"
            className="rounded-lg bg-neutral-800 px-4 py-2 hover:bg-neutral-700"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="rounded-lg bg-indigo-500 px-4 py-2 font-medium hover:bg-indigo-400"
          >
            Save
          </button>
        </div>
      </form>
    </main>
  );
}
