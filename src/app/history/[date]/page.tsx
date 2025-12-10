// src/app/history/[day]/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

import {
  ENTRY_LIMIT_BASE,
  coerceSummaryPreferences,
  entryLimitFor,
} from "@/lib/summaryPreferences";

export const dynamic = "force-dynamic";

type Props = { params: { day: string } };

export default async function EditDayPage({ params }: Props) {
  const day = params.day; // YYYY-MM-DD
  const supabase = await supabaseServer();

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

  let entryLimit = ENTRY_LIMIT_BASE;
  try {
    const { data: settingsRow, error: prefsError } = await supabase
      .from("user_vaults")
      .select("summary_preferences")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!prefsError && settingsRow?.summary_preferences) {
      const prefs = coerceSummaryPreferences(settingsRow.summary_preferences);
      entryLimit = entryLimitFor(!!prefs.extendedGuidance);
    }
  } catch (settingsError) {
    console.error("[history-day] entry_limit_fallback", settingsError);
  }

  const content = (entry?.content ?? "").slice(0, entryLimit);

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
          maxLength={entryLimit}
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
