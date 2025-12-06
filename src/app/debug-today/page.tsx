import TodayJournal from '../today/TodayJournal';
import { supabaseServer } from '@/lib/supabaseServer';
import {
    ENTRY_LIMIT_BASE,
    coerceSummaryPreferences,
    entryLimitFor,
} from '@/lib/summaryPreferences';

export const dynamic = 'force-dynamic';

export default async function DebugTodayPage() {
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
        console.error('[debug-today] entry_limit_fallback', error);
    }

    return (
        <main className="min-h-screen bg-neutral-950 text-neutral-100 border-4 border-blue-500">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <h1 className="text-red-500 text-2xl font-bold mb-4">DEBUG ROUTE - IF YOU SEE THIS, DEPLOYMENT IS WORKING</h1>
                <TodayJournal initialEntryLimit={entryLimit} />
            </div>
        </main>
    );
}
