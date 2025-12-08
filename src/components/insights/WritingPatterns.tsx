// src/components/insights/WritingPatterns.tsx
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import InsightCard from "./InsightCard";

type ActivityData = {
    date: string;
    count: number;
};

type WritingPatternsProps = {
    data: ActivityData[];
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayNamesShort = ["S", "M", "T", "W", "T", "F", "S"];

function getIntensityColor(ratio: number): string {
    if (ratio === 0) return "bg-neutral-800";
    if (ratio < 0.25) return "bg-emerald-900";
    if (ratio < 0.5) return "bg-emerald-700";
    if (ratio < 0.75) return "bg-emerald-500";
    return "bg-emerald-400";
}

export default function WritingPatterns({ data }: WritingPatternsProps) {
    const patterns = useMemo(() => {
        if (!data.length) return null;

        // Count entries by day of week
        const dayCount: number[] = [0, 0, 0, 0, 0, 0, 0];
        data.forEach((item) => {
            const date = new Date(item.date);
            dayCount[date.getDay()] += item.count;
        });

        const maxCount = Math.max(...dayCount);
        const totalEntries = dayCount.reduce((a, b) => a + b, 0);
        const bestDay = dayCount.indexOf(maxCount);

        // Calculate consistency (how many days have entries vs total days)
        const uniqueDays = new Set(data.map((d) => d.date)).size;
        const totalDays = Math.ceil((Date.now() - new Date(data[0]?.date || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
        const consistency = totalDays > 0 ? (uniqueDays / totalDays) * 100 : 0;

        // Current streak (simplified)
        let currentStreak = 0;
        const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const today = new Date().toISOString().slice(0, 10);

        for (const item of sorted) {
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() - currentStreak);
            if (item.date === expectedDate.toISOString().slice(0, 10)) {
                currentStreak++;
            } else if (currentStreak === 0 && item.date === today) {
                currentStreak = 1;
            } else {
                break;
            }
        }

        return { dayCount, maxCount, bestDay, totalEntries, consistency, currentStreak };
    }, [data]);

    return (
        <InsightCard
            title="Writing Patterns"
            subtitle="When do you journal most?"
            icon="📅"
            accentColor="indigo"
        >
            {!data.length ? (
                <div className="flex h-32 items-center justify-center text-neutral-400">
                    <p>Start journaling to see patterns</p>
                </div>
            ) : patterns && (
                <>
                    {/* Day of week heatmap */}
                    <div className="mb-4">
                        <p className="mb-2 text-xs text-neutral-400">Entries by day of week</p>
                        <div className="flex justify-between gap-2">
                            {dayNames.map((day, i) => (
                                <div key={day} className="flex flex-col items-center gap-1">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`h-10 w-10 rounded-lg ${getIntensityColor(patterns.dayCount[i] / patterns.maxCount)}`}
                                        title={`${day}: ${patterns.dayCount[i]} entries`}
                                    />
                                    <span className="text-xs text-neutral-500">{dayNamesShort[i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 rounded-xl bg-white/5 p-3">
                        <div className="text-center">
                            <p className="text-2xl">🔥</p>
                            <p className="text-xs text-neutral-400">Current Streak</p>
                            <p className="text-lg font-bold text-white">{patterns.currentStreak}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl">📊</p>
                            <p className="text-xs text-neutral-400">Consistency</p>
                            <p className="text-lg font-bold text-white">{Math.round(patterns.consistency)}%</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl">⭐</p>
                            <p className="text-xs text-neutral-400">Best Day</p>
                            <p className="text-lg font-bold text-white">{dayNames[patterns.bestDay]}</p>
                        </div>
                    </div>
                </>
            )}
        </InsightCard>
    );
}
