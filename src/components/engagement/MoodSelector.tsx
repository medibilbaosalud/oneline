// src/components/engagement/MoodSelector.tsx
"use client";

import { useState } from "react";

export type MoodScore = 1 | 2 | 3 | 4 | 5;

export type MoodOption = {
    score: MoodScore;
    emoji: string;
    label: string;
    color: string;
};

export const MOOD_OPTIONS: MoodOption[] = [
    { score: 1, emoji: "😢", label: "Rough", color: "from-red-500/30 to-red-600/30" },
    { score: 2, emoji: "😔", label: "Low", color: "from-orange-500/30 to-orange-600/30" },
    { score: 3, emoji: "😐", label: "Okay", color: "from-yellow-500/30 to-yellow-600/30" },
    { score: 4, emoji: "🙂", label: "Good", color: "from-green-500/30 to-green-600/30" },
    { score: 5, emoji: "😊", label: "Great", color: "from-emerald-500/30 to-emerald-600/30" },
];

type MoodSelectorProps = {
    value: MoodScore | null;
    onChange: (mood: MoodScore) => void;
    compact?: boolean;
};

export default function MoodSelector({ value, onChange, compact = false }: MoodSelectorProps) {
    const [hoveredMood, setHoveredMood] = useState<MoodScore | null>(null);

    if (compact) {
        return (
            <div className="flex items-center gap-1">
                {MOOD_OPTIONS.map((mood) => (
                    <button
                        key={mood.score}
                        type="button"
                        onClick={() => onChange(mood.score)}
                        className={`text-xl transition-all duration-150 hover:scale-125 ${value === mood.score
                                ? "scale-110 drop-shadow-lg"
                                : "opacity-50 hover:opacity-100"
                            }`}
                        title={mood.label}
                    >
                        {mood.emoji}
                    </button>
                ))}
            </div>
        );
    }

    const activeLabel = hoveredMood
        ? MOOD_OPTIONS.find(m => m.score === hoveredMood)?.label
        : value
            ? MOOD_OPTIONS.find(m => m.score === value)?.label
            : "How are you feeling?";

    return (
        <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-neutral-400">{activeLabel}</p>
            <div className="flex items-center gap-2">
                {MOOD_OPTIONS.map((mood) => (
                    <button
                        key={mood.score}
                        type="button"
                        onClick={() => onChange(mood.score)}
                        onMouseEnter={() => setHoveredMood(mood.score)}
                        onMouseLeave={() => setHoveredMood(null)}
                        className={`
              flex h-12 w-12 items-center justify-center rounded-xl text-2xl
              transition-all duration-200
              ${value === mood.score
                                ? `bg-gradient-to-br ${mood.color} ring-2 ring-white/30 scale-110`
                                : "bg-white/5 hover:bg-white/10"
                            }
              ${hoveredMood === mood.score && value !== mood.score ? "scale-105" : ""}
            `}
                        title={mood.label}
                    >
                        {mood.emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Get mood color for charts/visualizations
 */
export function getMoodColor(score: MoodScore | null): string {
    switch (score) {
        case 1: return "#ef4444"; // red
        case 2: return "#f97316"; // orange
        case 3: return "#eab308"; // yellow
        case 4: return "#22c55e"; // green
        case 5: return "#10b981"; // emerald
        default: return "#525252"; // neutral
    }
}

/**
 * Get mood emoji for display
 */
export function getMoodEmoji(score: MoodScore | null): string {
    return MOOD_OPTIONS.find(m => m.score === score)?.emoji ?? "•";
}
