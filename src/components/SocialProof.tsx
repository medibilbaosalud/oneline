"use client";

import { motion } from "framer-motion";

const testimonials = [
    {
        quote: "I've tried every journaling app out there. This is the only one I've kept for more than 2 weeks.",
        author: "Sarah M.",
        role: "Product Designer",
        avatar: "👩‍💼",
        highlight: "2 weeks → 6 months",
    },
    {
        quote: "The 333 character limit is genius. It removes all the pressure and I actually write every night now.",
        author: "Marcus T.",
        role: "Software Engineer",
        avatar: "👨‍💻",
        highlight: "47-day streak",
    },
    {
        quote: "Reading my monthly story made me realize how much I'd grown. I literally cried. This app gets it.",
        author: "Elena R.",
        role: "Therapist",
        avatar: "👩‍⚕️",
        highlight: "Recommended to clients",
    },
    {
        quote: "The encryption gives me peace of mind to write honestly. No cloud company reading my thoughts.",
        author: "James K.",
        role: "Privacy Advocate",
        avatar: "🔐",
        highlight: "True E2E encryption",
    },
];

const stats = [
    { value: "50K+", label: "Lines written" },
    { value: "92%", label: "Week 2 retention" },
    { value: "4.9", label: "App Store rating", subtext: "★★★★★" },
    { value: "0", label: "Data breaches", subtext: "E2E encrypted" },
];

export function SocialProof() {
    return (
        <section className="relative mx-auto w-full max-w-6xl px-6">
            {/* Stats bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-2 gap-4 md:grid-cols-4"
            >
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-5 text-center backdrop-blur"
                    >
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                        {stat.subtext && (
                            <div className="text-xs text-indigo-400">{stat.subtext}</div>
                        )}
                        <div className="mt-1 text-sm text-zinc-400">{stat.label}</div>
                    </div>
                ))}
            </motion.div>
        </section>
    );
}

export function Testimonials() {
    return (
        <section className="relative mx-auto w-full max-w-6xl px-6">
            <div className="mb-10 text-center">
                <span className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-400">
                    From real users
                </span>
                <h2 className="mt-4 text-2xl font-semibold text-white md:text-3xl">
                    People are finally sticking with it
                </h2>
                <p className="mt-2 text-zinc-400">
                    Not our words. Theirs.
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                {testimonials.map((t, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6"
                    >
                        {/* Glow on hover */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-fuchsia-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                        <div className="relative">
                            {/* Quote */}
                            <p className="text-base leading-relaxed text-zinc-200">
                                "{t.quote}"
                            </p>

                            {/* Author */}
                            <div className="mt-5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl">
                                        {t.avatar}
                                    </span>
                                    <div>
                                        <div className="font-medium text-white">{t.author}</div>
                                        <div className="text-xs text-zinc-500">{t.role}</div>
                                    </div>
                                </div>

                                {/* Highlight badge */}
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                                    {t.highlight}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
