// src/components/engagement/MoodChart.tsx
"use client";

import { useMemo } from "react";
import { getMoodColor, getMoodEmoji, type MoodScore } from "./MoodSelector";

type MoodDataPoint = {
    date: string;
    mood: MoodScore | null;
};

type MoodChartProps = {
    data: MoodDataPoint[];
    days?: number;
};

export default function MoodChart({ data, days = 30 }: MoodChartProps) {
    // Generate complete data for last N days
    const chartData = useMemo(() => {
        const today = new Date();
        const result: MoodDataPoint[] = [];

        // Create a map for O(1) lookup
        const dataMap = new Map(data.map(d => [d.date, d.mood]));

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().slice(0, 10);
            result.push({
                date: dateStr,
                mood: dataMap.get(dateStr) ?? null,
            });
        }

        return result;
    }, [data, days]);

    // Calculate average mood
    const stats = useMemo(() => {
        const moods = chartData.filter(d => d.mood !== null).map(d => d.mood as MoodScore);
        if (moods.length === 0) return null;

        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        const trend = moods.length >= 7
            ? moods.slice(-7).reduce((a, b) => a + b, 0) / 7 - moods.slice(0, 7).reduce((a, b) => a + b, 0) / 7
            : 0;

        return {
            average: avg,
            trend,
            count: moods.length,
            best: Math.max(...moods),
            worst: Math.min(...moods),
        };
    }, [chartData]);

    const maxHeight = 40;

    return (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">Mood Tracker</h3>
                    <p className="text-xs text-neutral-500">
                        Last {days} days • {stats?.count ?? 0} entries
                    </p>
                </div>

                {stats && (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs text-neutral-500">Average</p>
                            <p className="text-lg font-semibold text-white">
                                {getMoodEmoji(Math.round(stats.average) as MoodScore)}
                            </p>
                        </div>
                        {stats.trend !== 0 && (
                            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${stats.trend > 0
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-red-500/20 text-red-300"
                                }`}>
                                {stats.trend > 0 ? "↑" : "↓"}
                                {stats.trend > 0 ? "Better" : "Lower"}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="flex items-end gap-0.5" style={{ height: maxHeight + 20 }}>
                {chartData.map((point, idx) => {
                    const height = point.mood ? (point.mood / 5) * maxHeight : 4;
                    const color = getMoodColor(point.mood);
                    const isToday = idx === chartData.length - 1;

                    return (
                        <div
                            key={point.date}
                            className="group relative flex-1"
                            title={`${point.date}: ${point.mood ? getMoodEmoji(point.mood) : "No data"}`}
                        >
                            <div
                                className={`
                  mx-auto w-full max-w-[8px] rounded-t-sm transition-all duration-200
                  ${isToday ? "ring-1 ring-indigo-400" : ""}
                  ${point.mood ? "group-hover:opacity-80" : ""}
                `}
                                style={{
                                    height: `${height}px`,
                                    backgroundColor: color,
                                    opacity: point.mood ? 1 : 0.3,
                                }}
                            />

                            {/* Tooltip on hover */}
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                <div className="mb-1 whitespace-nowrap rounded bg-neutral-800 px-2 py-1 text-xs text-white shadow-lg">
                                    {point.mood ? getMoodEmoji(point.mood) : "—"}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* X-axis labels */}
            <div className="mt-2 flex justify-between text-[9px] text-neutral-600">
                <span>{chartData[0]?.date.slice(5)}</span>
                <span>Today</span>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-neutral-500">
                <span>😢 Rough</span>
                <span className="h-3 w-px bg-neutral-700" />
                <span>😐 Okay</span>
                <span className="h-3 w-px bg-neutral-700" />
                <span>😊 Great</span>
            </div>
        </div>
    );
}
