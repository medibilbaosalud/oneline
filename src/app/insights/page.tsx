// src/app/insights/page.tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { getActivityHistory, getOrCreateStreak } from "@/lib/streakService";
import MoodTrends from "@/components/insights/MoodTrends";
import WritingPatterns from "@/components/insights/WritingPatterns";
import StreakSummary from "@/components/insights/StreakSummary";
import InsightsOnboarding from "@/components/InsightsOnboarding";

type MoodData = { date: string; mood: number };
type ActivityData = { date: string; count: number };
type StreakData = {
    currentStreak: number;
    longestStreak: number;
    totalEntries: number;
    fireLevel: number;
};

export default function InsightsPage() {
    const [loading, setLoading] = useState(true);
    const [moodData, setMoodData] = useState<MoodData[]>([]);
    const [activityData, setActivityData] = useState<ActivityData[]>([]);
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const supabase = supabaseBrowser();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setError("Please sign in to view insights");
                    setLoading(false);
                    return;
                }

                // Load activity history (includes mood)
                const activity = await getActivityHistory(user.id, 90);

                // Transform data
                const moods: MoodData[] = activity
                    .filter((a) => a.mood_score != null)
                    .map((a) => ({ date: a.activity_date, mood: a.mood_score! }));

                const activities: ActivityData[] = activity.map((a) => ({
                    date: a.activity_date,
                    count: a.entries_count,
                }));

                setMoodData(moods);
                setActivityData(activities);

                // Load streak data
                const streak = await getOrCreateStreak(user.id);
                if (streak) {
                    setStreakData({
                        currentStreak: streak.current_streak,
                        longestStreak: streak.longest_streak,
                        totalEntries: streak.total_entries,
                        fireLevel: streak.fire_level,
                    });
                }
            } catch (err) {
                console.error("Error loading insights:", err);
                setError("Failed to load insights");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent"
                />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="text-center">
                    <p className="text-lg text-neutral-400">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen p-4 pb-20 pt-20"
        >
            <div className="mx-auto max-w-2xl space-y-6">
                {/* Header */}
                <header className="text-center">
                    <motion.h1
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-3xl font-bold text-transparent"
                    >
                        Your Insights
                    </motion.h1>
                    <p className="mt-2 text-neutral-400">
                        Discover patterns in your journaling
                    </p>
                </header>

                {/* Streak Summary */}
                {streakData && (
                    <StreakSummary
                        currentStreak={streakData.currentStreak}
                        longestStreak={streakData.longestStreak}
                        totalEntries={streakData.totalEntries}
                        fireLevel={streakData.fireLevel}
                    />
                )}

                {/* Mood Trends */}
                <MoodTrends data={moodData} period="month" />

                {/* Writing Patterns */}
                <WritingPatterns data={activityData} />

                {/* Empty state hint */}
                {moodData.length === 0 && activityData.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6 text-center"
                    >
                        <p className="text-4xl">✨</p>
                        <p className="mt-2 text-neutral-300">
                            Start journaling to unlock powerful insights about yourself
                        </p>
                        <a
                            href="/today"
                            className="mt-4 inline-block rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                        >
                            Write your first entry
                        </a>
                    </motion.div>
                )}
            </div>
            <InsightsOnboarding onComplete={() => { }} />
        </motion.div>
    );
}
