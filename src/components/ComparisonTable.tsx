"use client";

import { motion } from "framer-motion";

const comparisons = [
    {
        notes: "Unlimited text = overwhelm",
        oneline: "333 chars = razor focus",
        icon: "✂️",
    },
    {
        notes: "Scattered across folders",
        oneline: "One entry per day, always",
        icon: "📅",
    },
    {
        notes: "You never look back",
        oneline: "AI generates weekly/monthly stories",
        icon: "📖",
    },
    {
        notes: "Plain text, cloud readable",
        oneline: "End-to-end encrypted vault",
        icon: "🔐",
    },
    {
        notes: "No habit system",
        oneline: "Streaks, companions, momentum",
        icon: "🔥",
    },
    {
        notes: "Just storage",
        oneline: "Self-awareness tool",
        icon: "🧠",
    },
];

export function ComparisonTable() {
    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4 md:gap-0">
                {/* Notes App Column */}
                <div className="rounded-2xl md:rounded-r-none border border-white/10 bg-neutral-900/40 overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/10 bg-red-500/5">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📱</span>
                            <div>
                                <h3 className="font-semibold text-white">Notes App</h3>
                                <p className="text-xs text-zinc-500">What you're probably using</p>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {comparisons.map((item, i) => (
                            <motion.div
                                key={`notes-${i}`}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="px-5 py-4 flex items-center gap-3"
                            >
                                <span className="text-red-400/80">✗</span>
                                <span className="text-zinc-400 text-sm">{item.notes}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* OneLine Column */}
                <div className="rounded-2xl md:rounded-l-none border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent overflow-hidden shadow-lg shadow-indigo-500/10">
                    <div className="px-5 py-4 border-b border-indigo-500/20 bg-indigo-500/10">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">✨</span>
                            <div>
                                <h3 className="font-semibold text-white">OneLine</h3>
                                <p className="text-xs text-indigo-300/80">Built for self-awareness</p>
                            </div>
                        </div>
                    </div>
                    <div className="divide-y divide-indigo-500/10">
                        {comparisons.map((item, i) => (
                            <motion.div
                                key={`oneline-${i}`}
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 + 0.05 }}
                                className="px-5 py-4 flex items-center gap-3"
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-zinc-200 text-sm font-medium">{item.oneline}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom message */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="mt-6 text-center text-sm text-zinc-500"
            >
                OneLine is not another place to dump text. It's a <span className="text-indigo-400">daily ritual</span> that actually sticks.
            </motion.p>
        </div>
    );
}
