// src/app/insights/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { isSupabaseConfigured } from "@/lib/supabaseBrowser";
import { getActivityHistory, getOrCreateStreak } from "@/lib/streakService";
import MoodTrends from "@/components/insights/MoodTrends";
import WritingPatterns from "@/components/insights/WritingPatterns";
import InsightsOnboarding from "@/components/InsightsOnboarding";

type MoodData = { date: string; mood: number };
type ActivityData = { date: string; count: number };
type StreakData = {
    currentStreak: number;
    longestStreak: number;
    totalEntries: number;
    fireLevel: number;
};

const levelNames = ["No Fire", "Spark", "Ember", "Flame", "Blaze", "Inferno", "Golden Fire", "Diamond Fire"];
const COMPANIONS = [
    { min: 0, emoji: "🦊", name: "Lumen the Fox" },
    { min: 21, emoji: "🦉", name: "Atlas the Owl" },
    { min: 60, emoji: "🐋", name: "Nami the Whale" },
    { min: 120, emoji: "🐉", name: "Nova the Dragonfly" },
];

export default function InsightsPage() {
    const [loading, setLoading] = useState(true);
    const [moodData, setMoodData] = useState<MoodData[]>([]);
    const [activityData, setActivityData] = useState<ActivityData[]>([]);
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            if (!isSupabaseConfigured()) {
                setError("Please configure Supabase to view insights");
                setLoading(false);
                return;
            }

            try {
                const supabase = supabaseBrowser();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    setError("Please sign in to view insights");
                    setLoading(false);
                    return;
                }

                const activity = await getActivityHistory(user.id, 90);

                const moods: MoodData[] = activity
                    .filter((a) => a.mood_score != null)
                    .map((a) => ({ date: a.activity_date, mood: a.mood_score! }));

                const activities: ActivityData[] = activity.map((a) => ({
                    date: a.activity_date,
                    count: a.entries_count,
                }));

                setMoodData(moods);
                setActivityData(activities);

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
            <div className="flex min-h-screen items-center justify-center bg-neutral-950">
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
            <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <p className="text-lg text-neutral-400">{error}</p>
                    <Link
                        href="/auth"
                        className="mt-4 inline-block rounded-xl bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                        Sign in
                    </Link>
                </motion.div>
            </div>
        );
    }

    const level = Math.min(streakData?.fireLevel ?? 0, 7);
    const currentCompanion = [...COMPANIONS].reverse().find(c => (streakData?.currentStreak ?? 0) >= c.min) ?? COMPANIONS[0];
    const nextCompanion = COMPANIONS.find(c => c.min > (streakData?.currentStreak ?? 0));
    const hasNoData = moodData.length === 0 && activityData.length === 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-neutral-950 pb-20 pt-6"
        >
            <div className="mx-auto max-w-4xl px-4">
                {/* Header */}
                <header className="mb-8">
                    <p className="text-xs uppercase tracking-widest text-indigo-400">Insights</p>
                    <h1 className="mt-1 text-3xl font-bold text-white">Your Journey</h1>
                    <p className="mt-2 text-neutral-400">Discover patterns in your daily reflections</p>
                </header>

                {/* Hero Stats Row */}
                {streakData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        {/* Current Streak - Hero */}
                        <div className="relative col-span-2 overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent p-6">
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />
                            <div className="relative flex items-center gap-5">
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10"
                                >
                                    <span className="text-5xl">{level === 0 ? "💨" : "🔥"}</span>
                                </motion.div>
                                <div className="flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-bold text-white">{streakData.currentStreak}</span>
                                        <span className="text-lg text-neutral-400">days</span>
                                    </div>
                                    <p className="mt-1 text-sm text-neutral-400">Current streak</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-300">
                                            Lv{level} {levelNames[level]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Progress to next level */}
                            <div className="mt-4">
                                <div className="mb-1 flex justify-between text-xs">
                                    <span className="text-neutral-500">Progress to Lv{level + 1}</span>
                                    <span className="text-neutral-400">{Math.round((streakData.currentStreak % 30) / 30 * 100)}%</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(streakData.currentStreak % 30) / 30 * 100}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-400"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Best Streak */}
                        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">🏆</span>
                                <div>
                                    <p className="text-2xl font-bold text-white">{streakData.longestStreak}</p>
                                    <p className="text-xs text-neutral-500">Best streak</p>
                                </div>
                            </div>
                        </div>

                        {/* Total Entries */}
                        <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
                            <div className="flex items-center gap-3">
                                <span className="text-3xl">📝</span>
                                <div>
                                    <p className="text-2xl font-bold text-white">{streakData.totalEntries}</p>
                                    <p className="text-xs text-neutral-500">Total entries</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Companion Card */}
                {streakData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200 }}
                                    className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-3xl"
                                >
                                    {currentCompanion.emoji}
                                </motion.span>
                                <div>
                                    <p className="text-sm text-indigo-300">Your Companion</p>
                                    <p className="text-lg font-semibold text-white">{currentCompanion.name}</p>
                                </div>
                            </div>
                            {nextCompanion && (
                                <div className="text-right">
                                    <p className="text-xs text-neutral-500">Next unlock</p>
                                    <p className="text-sm text-neutral-300">
                                        {nextCompanion.emoji} {nextCompanion.name} at {nextCompanion.min} days
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Main Insights Grid */}
                <div className="space-y-6">
                    {/* Mood Trends */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <MoodTrends data={moodData} period="month" />
                    </motion.div>

                    {/* Writing Patterns */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <WritingPatterns data={activityData} />
                    </motion.div>
                </div>

                {/* Empty State with better CTA */}
                {hasNoData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent p-8 text-center"
                    >
                        <span className="text-5xl">✨</span>
                        <h3 className="mt-4 text-xl font-semibold text-white">Your insights await</h3>
                        <p className="mt-2 text-neutral-400">
                            Start journaling to unlock powerful patterns about yourself.
                            Just one line a day reveals so much.
                        </p>
                        <Link
                            href="/today"
                            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500"
                        >
                            Write your first entry
                            <span>→</span>
                        </Link>
                    </motion.div>
                )}
            </div>
            <InsightsOnboarding onComplete={() => { }} />
        </motion.div>
    );
}
