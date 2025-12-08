// src/components/insights/StreakSummary.tsx
"use client";

import { motion } from "framer-motion";
import InsightCard from "./InsightCard";

type StreakSummaryProps = {
    currentStreak: number;
    longestStreak: number;
    totalEntries: number;
    fireLevel: number;
};

const levelNames = [
    "No Fire",
    "Spark",
    "Ember",
    "Flame",
    "Blaze",
    "Inferno",
    "Golden Fire",
    "Diamond Fire",
];

const levelColors = [
    "text-neutral-500",
    "text-orange-300",
    "text-orange-400",
    "text-orange-500",
    "text-orange-600",
    "text-red-500",
    "text-yellow-400",
    "text-cyan-300",
];

export default function StreakSummary({
    currentStreak,
    longestStreak,
    totalEntries,
    fireLevel,
}: StreakSummaryProps) {
    const level = Math.min(fireLevel, 7);

    return (
        <InsightCard
            title="Your Fire"
            subtitle="Keep the flame alive"
            icon="🔥"
            accentColor="rose"
        >
            <div className="flex items-center gap-6">
                {/* Fire animation */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="relative flex h-24 w-24 items-center justify-center"
                >
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.8, 1, 0.8],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        className="absolute inset-0 rounded-full bg-gradient-to-t from-orange-600/30 to-yellow-500/20 blur-xl"
                    />
                    <span className="text-5xl">
                        {level === 0 ? "💨" : level < 3 ? "🔥" : level < 5 ? "🔥" : level < 7 ? "⚡" : "💎"}
                    </span>
                </motion.div>

                {/* Stats */}
                <div className="flex-1 space-y-2">
                    <div>
                        <p className={`text-3xl font-bold ${levelColors[level]}`}>
                            {currentStreak} days
                        </p>
                        <p className="text-sm text-neutral-400">Current streak</p>
                    </div>

                    <div className="flex gap-4 text-sm">
                        <div>
                            <p className="font-medium text-white">{longestStreak}</p>
                            <p className="text-xs text-neutral-500">Best streak</p>
                        </div>
                        <div>
                            <p className="font-medium text-white">{totalEntries}</p>
                            <p className="text-xs text-neutral-500">Total entries</p>
                        </div>
                        <div>
                            <p className={`font-medium ${levelColors[level]}`}>Lv{level}</p>
                            <p className="text-xs text-neutral-500">{levelNames[level]}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Level progress bar */}
            <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs">
                    <span className="text-neutral-400">Level {level}</span>
                    <span className="text-neutral-400">Level {level + 1}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((currentStreak % 30) / 30 * 100, 100)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-orange-500 to-yellow-400"
                    />
                </div>
            </div>
        </InsightCard>
    );
}
