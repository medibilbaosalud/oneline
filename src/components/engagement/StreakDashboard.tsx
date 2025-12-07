// src/components/engagement/StreakDashboard.tsx
"use client";

import { useStreak } from "@/hooks/useStreak";
import FireLevel from "./FireLevel";
import ActivityCalendar from "./ActivityCalendar";

export default function StreakDashboard() {
    const { streak, activity, badges, loading, isAtRisk, hasWrittenToday } = useStreak();

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="h-36 animate-pulse rounded-2xl bg-neutral-800/50" />
                <div className="h-32 animate-pulse rounded-2xl bg-neutral-800/50" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <FireLevel
                streak={streak}
                isAtRisk={isAtRisk}
                hasWrittenToday={hasWrittenToday}
            />

            <ActivityCalendar activity={activity} weeks={12} />

            {/* Badges section */}
            {badges.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-white">Achievements</h3>
                    <div className="flex flex-wrap gap-2">
                        {badges.includes("streak_7") && (
                            <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
                                <span>🏅</span>
                                <span>7 Days</span>
                            </div>
                        )}
                        {badges.includes("streak_30") && (
                            <div className="flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-sm text-purple-300">
                                <span>🏆</span>
                                <span>30 Days</span>
                            </div>
                        )}
                        {badges.includes("streak_100") && (
                            <div className="flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1 text-sm text-cyan-300">
                                <span>💎</span>
                                <span>100 Days</span>
                            </div>
                        )}
                        {badges.includes("streak_365") && (
                            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 text-sm text-yellow-300">
                                <span>👑</span>
                                <span>365 Days</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
