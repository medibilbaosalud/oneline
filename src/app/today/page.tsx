import TodayJournal from './TodayJournal';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  ENTRY_LIMIT_BASE,
  coerceSummaryPreferences,
  entryLimitFor,
} from '@/lib/summaryPreferences';
import FeedbackBanner from '@/components/FeedbackBanner';
import NotificationPrompt from '@/components/NotificationPrompt';
import WhatsNewModal from '@/components/WhatsNewModal';

export const metadata = { title: 'Today — OneLine' };
export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  let entryLimit = ENTRY_LIMIT_BASE;

  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from('user_vaults')
        .select('summary_preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data?.summary_preferences) {
        const preferences = coerceSummaryPreferences(data.summary_preferences);
        entryLimit = entryLimitFor(!!preferences.extendedGuidance);
      }
    }
  } catch (error) {
    console.error('[today] entry_limit_fallback', error);
  }

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
              year: 'numeric',
            })}
          </h1>
        </header>
        <FeedbackBanner />
        <TodayJournal initialEntryLimit={entryLimit} />
        <NotificationPrompt />
        <WhatsNewModal />
      </div>
    </main>
  );
}