"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CHAR_LIMIT = 333;

const DEMO_PHRASES = [
    "Had coffee with Sam today. She's going through something similar at work and it helped to hear I'm not alone in this.",
    "Finally finished the project I've been putting off for weeks. Small win, but it feels like a weight lifted.",
    "Noticed I was anxious all morning but couldn't figure out why. By evening it passed. Bodies are strange.",
    "Good day. Nothing spectacular, just... calm. More days like this, please.",
];

export function LandingDemo() {
    const [text, setText] = useState("");
    const [showSaved, setShowSaved] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);

    const startTypingDemo = useCallback(() => {
        if (isTyping) return;
        setIsTyping(true);
        setShowSaved(false);
        setText("");

        const phrase = DEMO_PHRASES[currentPhraseIndex];
        let charIndex = 0;

        const typeInterval = setInterval(() => {
            if (charIndex < phrase.length) {
                setText(phrase.slice(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                setShowSaved(true);
                setIsTyping(false);
                setCurrentPhraseIndex((prev) => (prev + 1) % DEMO_PHRASES.length);
            }
        }, 35);

        return () => clearInterval(typeInterval);
    }, [isTyping, currentPhraseIndex]);

    // Auto-start demo after mount
    useEffect(() => {
        const timer = setTimeout(() => {
            startTypingDemo();
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Loop the demo
    useEffect(() => {
        if (showSaved) {
            const timer = setTimeout(() => {
                startTypingDemo();
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [showSaved, startTypingDemo]);

    const progress = (text.length / CHAR_LIMIT) * 100;

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            {/* Mock window frame */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/80 shadow-2xl shadow-indigo-500/10 backdrop-blur overflow-hidden">
                {/* Window header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/30">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/80" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="ml-3 text-xs text-zinc-500 font-medium">Today — OneLine</span>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Entry for</p>
                            <p className="text-lg font-semibold text-white">
                                {new Date().toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                        <span className="text-xs text-zinc-500 px-3 py-1 rounded-full border border-white/10 bg-white/5">
                            {CHAR_LIMIT} chars max
                        </span>
                    </div>

                    {/* Textarea mock */}
                    <div className="relative">
                        <div className="min-h-[120px] rounded-xl border border-white/10 bg-black/30 p-4 text-base leading-relaxed text-zinc-100">
                            {text || (
                                <span className="text-zinc-500">One line that captures your day…</span>
                            )}
                            {isTyping && (
                                <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.6 }}
                                    className="inline-block w-0.5 h-5 bg-indigo-400 ml-0.5 align-middle"
                                />
                            )}
                        </div>
                    </div>

                    {/* Progress bar and save button */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", damping: 15 }}
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-zinc-500">
                                {text.length}/{CHAR_LIMIT} characters
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {showSaved ? (
                                <motion.div
                                    key="saved"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 text-sm font-medium text-emerald-400"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Saved & encrypted
                                </motion.div>
                            ) : (
                                <motion.button
                                    key="save"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    disabled
                                    className="rounded-xl bg-indigo-500/50 px-5 py-2.5 text-sm font-medium text-white/70 cursor-not-allowed"
                                >
                                    Save entry
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Floating labels */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="absolute -left-4 top-1/3 -translate-x-full hidden lg:block"
            >
                <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg px-3 py-2 text-xs text-indigo-300">
                    <span className="block font-semibold">30 seconds</span>
                    <span className="text-indigo-400/80">to write</span>
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="absolute -right-4 top-1/2 translate-x-full hidden lg:block"
            >
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-300">
                    <span className="block font-semibold">E2E Encrypted</span>
                    <span className="text-emerald-400/80">before saving</span>
                </div>
            </motion.div>
        </div>
    );
}
