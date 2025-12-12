"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const sampleStory = `**This week felt like a quiet turning point.**

The project I'd been avoiding finally got done on Tuesday. It wasn't perfect, but it's out there now. That's what matters. Sarah's words at coffee stuck with me: "Done is better than perfect." I'm starting to believe it.

Wednesday was harder. Woke up anxious for no clear reason. By evening it had passed, but I'm noticing these patterns more now — the morning fog that lifts by dinner. Writing it down helps me see it's temporary.

**The small wins are adding up.** Three gym sessions this week. Actually read before bed instead of scrolling. Had a real conversation with Mom instead of just logistics.

*Looking back, I'm growing in ways I couldn't see day-to-day. That's the whole point of this, isn't it?*`;

export function StoryPreview() {
    const [visibleChars, setVisibleChars] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (visibleChars >= sampleStory.length) {
            setIsComplete(true);
            // Reset after a pause
            const resetTimer = setTimeout(() => {
                setVisibleChars(0);
                setIsComplete(false);
            }, 8000);
            return () => clearTimeout(resetTimer);
        }

        const timer = setTimeout(() => {
            setVisibleChars((prev) => Math.min(prev + 3, sampleStory.length));
        }, 15);

        return () => clearTimeout(timer);
    }, [visibleChars]);

    // Parse markdown-like syntax for display
    const formatText = (text: string) => {
        return text
            .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em class="text-indigo-300">$1</em>')
            .replace(/\n\n/g, '</p><p class="mt-4">');
    };

    const displayText = sampleStory.slice(0, visibleChars);

    return (
        <section className="relative mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 text-center">
                <span className="inline-block rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-fuchsia-300">
                    AI-Generated
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    This is what your weekly story looks like
                </h2>
                <p className="mt-2 text-zinc-400">
                    Written by AI, in your voice, from your daily lines
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
                {/* Left: Sample entries */}
                <div className="space-y-3">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-4">
                        Your daily entries →
                    </div>
                    {[
                        { day: "Mon", text: "Finally finished the project. Done is better than perfect." },
                        { day: "Tue", text: "Coffee with Sarah. Her advice is always grounding." },
                        { day: "Wed", text: "Woke up anxious. By evening it passed. Writing helps." },
                        { day: "Thu", text: "Third gym session this week. Feeling stronger." },
                        { day: "Fri", text: "Read before bed instead of scrolling. Small win." },
                        { day: "Sat", text: "Real conversation with Mom. Not just logistics." },
                        { day: "Sun", text: "Quiet day. Noticed how much I've grown this week." },
                    ].map((entry, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                        >
                            <span className="text-xs font-medium text-indigo-400">{entry.day}</span>
                            <p className="mt-1 text-sm text-zinc-300">{entry.text}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Right: Generated story */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-indigo-500/5 p-6 shadow-lg shadow-fuchsia-500/10"
                >
                    {/* Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs uppercase tracking-wider text-fuchsia-400">Weekly Story</div>
                            <div className="text-sm text-zinc-400">Dec 2-8, 2024</div>
                        </div>
                        {isComplete && (
                            <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400"
                            >
                                ✓ Generated
                            </motion.span>
                        )}
                    </div>

                    {/* Story content */}
                    <div className="prose prose-invert prose-sm max-w-none">
                        <p
                            className="text-sm leading-relaxed text-zinc-300"
                            dangerouslySetInnerHTML={{ __html: formatText(displayText) }}
                        />
                        {!isComplete && (
                            <motion.span
                                animate={{ opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.6 }}
                                className="inline-block w-0.5 h-4 bg-fuchsia-400 ml-0.5 align-middle"
                            />
                        )}
                    </div>

                    {/* Floating elements */}
                    <div className="absolute -right-2 -top-2 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 p-2 shadow-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                            <path d="M12 3L2 12h3v9h6v-6h2v6h6v-9h3L12 3z" fill="currentColor" />
                        </svg>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
