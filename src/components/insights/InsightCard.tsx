// src/components/insights/InsightCard.tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type InsightCardProps = {
    title: string;
    subtitle?: string;
    icon: string;
    children: ReactNode;
    className?: string;
    accentColor?: "indigo" | "amber" | "emerald" | "rose";
};

const accentColors = {
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20",
    amber: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
    rose: "from-rose-500/20 to-rose-600/5 border-rose-500/20",
};

export default function InsightCard({
    title,
    subtitle,
    icon,
    children,
    className = "",
    accentColor = "indigo",
}: InsightCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${accentColors[accentColor]} p-5 ${className}`}
        >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl" />

            <header className="mb-4 flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
                    )}
                </div>
            </header>

            <div className="relative">{children}</div>
        </motion.div>
    );
}
