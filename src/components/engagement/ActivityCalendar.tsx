// src/components/engagement/ActivityCalendar.tsx
"use client";

import { useMemo } from "react";
import type { DailyActivity } from "@/lib/streakService";

type ActivityCalendarProps = {
    activity: DailyActivity[];
    weeks?: number;
};

export default function ActivityCalendar({ activity, weeks = 12 }: ActivityCalendarProps) {
    // Generate calendar grid
    const grid = useMemo(() => {
        const today = new Date();
        const result: { date: string; count: number; isToday: boolean }[][] = [];

        // Start from (weeks) weeks ago, aligned to Sunday
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - (weeks * 7) + (7 - today.getDay()));

        // Create activity map for O(1) lookup
        const activityMap = new Map(activity.map(a => [a.activity_date, a.entries_count]));

        // Generate weeks
        let currentDate = new Date(startDate);
        for (let w = 0; w < weeks; w++) {
            const week: { date: string; count: number; isToday: boolean }[] = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = currentDate.toISOString().slice(0, 10);
                week.push({
                    date: dateStr,
                    count: activityMap.get(dateStr) ?? 0,
                    isToday: dateStr === today.toISOString().slice(0, 10),
                });
                currentDate.setDate(currentDate.getDate() + 1);
            }
            result.push(week);
        }

        return result;
    }, [activity, weeks]);

    const getIntensityClass = (count: number, isToday: boolean) => {
        if (isToday) return "ring-2 ring-indigo-400 ring-offset-1 ring-offset-neutral-900";

        const baseClasses = "transition-all duration-200 hover:scale-125";
        if (count === 0) return `${baseClasses} bg-neutral-800`;
        if (count === 1) return `${baseClasses} bg-emerald-700`;
        if (count === 2) return `${baseClasses} bg-emerald-600`;
        if (count >= 3) return `${baseClasses} bg-emerald-500`;
        return `${baseClasses} bg-neutral-800`;
    };

    const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
    const monthLabels = useMemo(() => {
        const labels: { week: number; label: string }[] = [];
        let lastMonth = -1;

        grid.forEach((week, weekIndex) => {
            const firstDay = new Date(week[0].date);
            if (firstDay.getMonth() !== lastMonth) {
                lastMonth = firstDay.getMonth();
                labels.push({
                    week: weekIndex,
                    label: firstDay.toLocaleString("default", { month: "short" }),
                });
            }
        });

        return labels;
    }, [grid]);

    const totalDaysWritten = activity.length;
    const totalEntries = activity.reduce((sum, a) => sum + a.entries_count, 0);

    return (
        <div className="rounded-2xl border border-white/10 bg-neutral-950/70 p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-white">Activity</h3>
                    <p className="text-xs text-neutral-500">
                        {totalDaysWritten} days • {totalEntries} entries
                    </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <span>Less</span>
                    <div className="h-3 w-3 rounded-sm bg-neutral-800" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-700" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-600" />
                    <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                    <span>More</span>
                </div>
            </div>

            {/* Month labels */}
            <div className="mb-1 ml-6 flex gap-0">
                {monthLabels.map(({ week, label }) => (
                    <div
                        key={`${week}-${label}`}
                        className="text-[10px] text-neutral-500"
                        style={{ marginLeft: week === 0 ? 0 : `${(week - (monthLabels[monthLabels.indexOf({ week, label }) - 1]?.week ?? 0)) * 14}px` }}
                    >
                        {label}
                    </div>
                ))}
            </div>

            <div className="flex gap-1">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5 pr-1">
                    {dayLabels.map((day, i) => (
                        <div key={i} className="flex h-3 w-4 items-center justify-center text-[9px] text-neutral-500">
                            {i % 2 === 1 ? day : ""}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="flex gap-0.5 overflow-x-auto pb-1">
                    {grid.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-0.5">
                            {week.map((day) => (
                                <div
                                    key={day.date}
                                    className={`h-3 w-3 rounded-sm ${getIntensityClass(day.count, day.isToday)} ${day.count > 0 ? "cursor-pointer" : ""}`}
                                    title={`${day.date}: ${day.count} ${day.count === 1 ? "entry" : "entries"}`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
