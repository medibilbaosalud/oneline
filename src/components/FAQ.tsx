"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const faqs = [
    {
        q: "What happens if I forget my passphrase?",
        a: "Your data stays sealed forever. We cannot recover it — that's how true encryption works. We recommend writing your passphrase somewhere safe (not digitally). This isn't a bug; it's the whole point.",
    },
    {
        q: "Can I export my data?",
        a: "Yes! You can export everything as decrypted JSON anytime from Settings. Your data is yours. No vendor lock-in, no questions asked.",
    },
    {
        q: "Is there a mobile app?",
        a: "OneLine is a Progressive Web App (PWA). On iOS/Android, tap 'Add to Home Screen' from your browser and it works like a native app — with offline support and notifications.",
    },
    {
        q: "How is this different from Apple Notes or Google Keep?",
        a: "Three key differences: (1) The 333-character limit removes overthinking, (2) True end-to-end encryption means even we can't read your entries, (3) AI generates stories from your weeks/months so you actually look back.",
    },
    {
        q: "Is it really free?",
        a: "Daily journaling is free forever. Story generation has a generous monthly limit. We may add premium features later, but the core experience will always be free.",
    },
    {
        q: "Who can read my entries?",
        a: "Only you. Entries are encrypted on your device before they ever leave it. Our servers only store ciphertext. Even if we were hacked, attackers would get meaningless data.",
    },
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="relative mx-auto w-full max-w-4xl px-6">
            <div className="mb-10 text-center">
                <h2 className="text-2xl font-semibold text-white md:text-3xl">
                    Frequently asked questions
                </h2>
                <p className="mt-2 text-zinc-400">
                    Everything you need to know before starting
                </p>
            </div>

            <div className="space-y-3">
                {faqs.map((faq, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                    >
                        <button
                            onClick={() => setOpenIndex(openIndex === i ? null : i)}
                            className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-white/5"
                        >
                            <span className="font-medium text-white pr-4">{faq.q}</span>
                            <motion.span
                                animate={{ rotate: openIndex === i ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex-shrink-0 text-zinc-400"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M6 9l6 6 6-6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </motion.span>
                        </button>

                        <AnimatePresence>
                            {openIndex === i && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="px-6 pb-4 text-sm leading-relaxed text-zinc-300">
                                        {faq.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
