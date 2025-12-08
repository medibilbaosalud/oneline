// src/components/insights/MoodTrends.tsx
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import InsightCard from "./InsightCard";

type MoodData = {
    date: string;
    mood: number;
};

type MoodTrendsProps = {
    data: MoodData[];
    period?: "week" | "month" | "year";
};

const moodEmojis = ["", "😢", "😔", "😐", "🙂", "😊"];
const moodLabels = ["", "Very Low", "Low", "Neutral", "Good", "Great"];

function getMoodColor(mood: number): string {
    if (mood <= 1) return "#ef4444"; // red
    if (mood <= 2) return "#f97316"; // orange
    if (mood <= 3) return "#eab308"; // yellow
    if (mood <= 4) return "#22c55e"; // green
    return "#10b981"; // emerald
}

export default function MoodTrends({ data, period = "month" }: MoodTrendsProps) {
    const stats = useMemo(() => {
        if (!data.length) return null;

        const moods = data.map((d) => d.mood);
        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        const max = Math.max(...moods);
        const min = Math.min(...moods);

        // Trend: compare first half vs second half
        const mid = Math.floor(moods.length / 2);
        const firstHalf = moods.slice(0, mid);
        const secondHalf = moods.slice(mid);
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const trend = secondAvg - firstAvg;

        return { avg, max, min, trend };
    }, [data]);

    const maxBarHeight = 60;

    return (
        <InsightCard
            title="Mood Journey"
            subtitle={`Last ${period === "week" ? "7 days" : period === "month" ? "30 days" : "year"}`}
            icon="📈"
            accentColor="emerald"
        >
            {!data.length ? (
                <div className="flex h-32 items-center justify-center text-neutral-400">
                    <p>Track your mood to see patterns</p>
                </div>
            ) : (
                <>
                    {/* Bar Chart */}
                    <div className="mb-4 flex h-20 items-end justify-between gap-1">
                        {data.slice(-30).map((item, i) => (
                            <motion.div
                                key={item.date}
                                initial={{ height: 0 }}
                                animate={{ height: `${(item.mood / 5) * maxBarHeight}px` }}
                                transition={{ delay: i * 0.02, duration: 0.3 }}
                                className="flex-1 rounded-t-sm"
                                style={{ backgroundColor: getMoodColor(item.mood), minWidth: "4px", maxWidth: "12px" }}
                                title={`${item.date}: ${moodLabels[item.mood]}`}
                            />
                        ))}
                    </div>

                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-3 gap-3 rounded-xl bg-white/5 p-3">
                            <div className="text-center">
                                <p className="text-2xl">{moodEmojis[Math.round(stats.avg)]}</p>
                                <p className="text-xs text-neutral-400">Average</p>
                                <p className="text-sm font-medium text-white">{stats.avg.toFixed(1)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl">{stats.trend > 0 ? "📈" : stats.trend < 0 ? "📉" : "➡️"}</p>
                                <p className="text-xs text-neutral-400">Trend</p>
                                <p className={`text-sm font-medium ${stats.trend > 0 ? "text-emerald-400" : stats.trend < 0 ? "text-rose-400" : "text-neutral-300"}`}>
                                    {stats.trend > 0 ? "Improving" : stats.trend < 0 ? "Declining" : "Stable"}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl">{moodEmojis[stats.max]}</p>
                                <p className="text-xs text-neutral-400">Best Day</p>
                                <p className="text-sm font-medium text-white">{moodLabels[stats.max]}</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </InsightCard>
    );
}
