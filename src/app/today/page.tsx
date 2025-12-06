import TodayView from './TodayView';
import { supabaseServer } from '@/lib/supabaseServer';
import {
  ENTRY_LIMIT_BASE,
  coerceSummaryPreferences,
  entryLimitFor,
} from '@/lib/summaryPreferences';

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
    <main className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-red-500">TESTING PAGE UPDATE - IF YOU SEE THIS, PAGE.TSX IS WORKING</h1>
    </main>
  );
}