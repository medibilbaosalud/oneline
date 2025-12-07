// src/components/engagement/FireLevel.tsx
"use client";

import { useMemo } from "react";
import type { UserStreak } from "@/lib/streakService";

type FireLevelProps = {
    streak: UserStreak | null;
    isAtRisk: boolean;
    hasWrittenToday: boolean;
    compact?: boolean;
};

const FIRE_CONFIGS = [
    { color: "from-gray-400 to-gray-600", glow: "shadow-gray-500/30", emoji: "💨", label: "No fire" },
    { color: "from-orange-300 to-orange-500", glow: "shadow-orange-400/40", emoji: "🔥", label: "Ember" },
    { color: "from-orange-400 to-red-500", glow: "shadow-orange-500/50", emoji: "🔥", label: "Small flame" },
    { color: "from-orange-500 to-red-600", glow: "shadow-red-500/50", emoji: "🔥🔥", label: "Growing" },
    { color: "from-red-500 to-red-700", glow: "shadow-red-600/60", emoji: "🔥🔥🔥", label: "Blazing" },
    { color: "from-red-600 to-pink-600", glow: "shadow-pink-500/60", emoji: "✨🔥", label: "Inferno" },
    { color: "from-yellow-400 to-orange-500", glow: "shadow-yellow-500/70", emoji: "⭐🔥", label: "Golden fire" },
    { color: "from-cyan-400 to-blue-500", glow: "shadow-cyan-400/70", emoji: "💎🔥", label: "Diamond fire" },
];

export default function FireLevel({ streak, isAtRisk, hasWrittenToday, compact = false }: FireLevelProps) {
    const config = useMemo(() => {
        const level = streak?.fire_level ?? 0;
        return FIRE_CONFIGS[Math.min(level, FIRE_CONFIGS.length - 1)];
    }, [streak?.fire_level]);

    const currentStreak = streak?.current_streak ?? 0;
    const longestStreak = streak?.longest_streak ?? 0;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xl">{config.emoji}</span>
                <span className="font-bold text-white">{currentStreak}</span>
                {isAtRisk && !hasWrittenToday && (
                    <span className="animate-pulse text-xs text-amber-400">⚠️</span>
                )}
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-6">
            {/* Background glow effect */}
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${config.color} opacity-10 blur-3xl`} />

            <div className="relative flex flex-col items-center gap-4 sm:flex-row">
                {/* Fire visualization */}
                <div className="relative">
                    <div
                        className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${config.color} shadow-2xl ${config.glow} transition-all duration-500`}
                        style={{
                            animation: currentStreak > 0 ? "pulse 2s ease-in-out infinite" : "none",
                        }}
                    >
                        <span className="text-4xl drop-shadow-lg">{config.emoji}</span>
                    </div>

                    {/* Level badge */}
                    <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-lg">
                        Lv{streak?.fire_level ?? 0}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                        <span className="text-4xl font-black text-white">{currentStreak}</span>
                        <span className="text-lg text-neutral-400">day streak</span>
                    </div>

                    <p className="mt-1 text-sm text-neutral-500">
                        {config.label} • Best: {longestStreak} days
                    </p>

                    {/* Status message */}
                    <div className="mt-3">
                        {hasWrittenToday ? (
                            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-300">
                                <span>✓</span>
                                <span>You wrote today!</span>
                            </div>
                        ) : isAtRisk && currentStreak > 0 ? (
                            <div className="inline-flex animate-pulse items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
                                <span>⚠️</span>
                                <span>Write today to keep your streak!</span>
                            </div>
                        ) : currentStreak === 0 ? (
                            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-500/20 px-3 py-1 text-sm text-neutral-400">
                                <span>✍️</span>
                                <span>Start your streak today</span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Freeze tokens */}
                {(streak?.freeze_tokens ?? 0) > 0 && (
                    <div className="flex flex-col items-center gap-1 rounded-xl bg-cyan-500/10 px-4 py-3">
                        <span className="text-2xl">🧊</span>
                        <span className="text-xs text-cyan-300">{streak?.freeze_tokens} freezes</span>
                    </div>
                )}
            </div>

            {/* CSS for pulse animation */}
            <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
        </div>
    );
}
