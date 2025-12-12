"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function FeatureShowcase() {
    return (
        <div className="grid gap-6 md:grid-cols-3">
            <WriteDemo />
            <EncryptDemo />
            <StoryDemo />
        </div>
    );
}

function WriteDemo() {
    const [charCount, setCharCount] = useState(0);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        const animate = () => {
            setAnimating(true);
            setCharCount(0);
            let count = 0;
            const interval = setInterval(() => {
                count += Math.floor(Math.random() * 8) + 3;
                if (count >= 156) {
                    count = 156;
                    clearInterval(interval);
                    setTimeout(() => {
                        setAnimating(false);
                    }, 2000);
                }
                setCharCount(count);
            }, 100);
            return interval;
        };

        const interval = animate();
        const loopInterval = setInterval(() => {
            animate();
        }, 6000);

        return () => {
            clearInterval(interval);
            clearInterval(loopInterval);
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 overflow-hidden"
        >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl mb-4">
                    ⚡
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">Write in 30 seconds</h3>
                <p className="text-sm text-zinc-400 mb-6">
                    333 characters is the perfect length. Long enough to be meaningful, short enough to actually do it.
                </p>

                {/* Mini demo */}
                <div className="rounded-xl bg-black/40 border border-white/5 p-4">
                    <div className="space-y-3">
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                                animate={{ width: `${(charCount / 333) * 100}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{charCount}/333</span>
                            <AnimatePresence mode="wait">
                                {charCount >= 156 ? (
                                    <motion.span
                                        key="done"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-emerald-400 font-medium"
                                    >
                                        ✓ Done in 28s
                                    </motion.span>
                                ) : (
                                    <motion.span
                                        key="typing"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-zinc-500"
                                    >
                                        Typing...
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function EncryptDemo() {
    const [encrypted, setEncrypted] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setEncrypted((prev) => !prev);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const plaintext = "Had a good day today...";
    const ciphertext = "aGFkIGEgZ29vZCBkYXku...";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl mb-4">
                    🔐
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">Encrypted by default</h3>
                <p className="text-sm text-zinc-400 mb-6">
                    Your passphrase creates the key locally. We never see your plaintext — only you can unlock your vault.
                </p>

                {/* Encryption animation */}
                <div className="rounded-xl bg-black/40 border border-white/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                            {!encrypted ? (
                                <motion.div
                                    key="plain"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex-1"
                                >
                                    <p className="text-xs text-zinc-500 mb-1">Your text</p>
                                    <p className="text-sm text-zinc-200 font-mono">{plaintext}</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="cipher"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="flex-1"
                                >
                                    <p className="text-xs text-emerald-400 mb-1">Encrypted (AES-GCM)</p>
                                    <p className="text-sm text-emerald-300/80 font-mono">{ciphertext}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.div
                            animate={{ rotate: encrypted ? 360 : 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-2xl"
                        >
                            {encrypted ? "🔒" : "🔓"}
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StoryDemo() {
    const [progress, setProgress] = useState(0);
    const [showStory, setShowStory] = useState(false);

    useEffect(() => {
        const animate = () => {
            setProgress(0);
            setShowStory(false);

            let p = 0;
            const interval = setInterval(() => {
                p += 5;
                if (p >= 100) {
                    p = 100;
                    clearInterval(interval);
                    setShowStory(true);
                }
                setProgress(p);
            }, 100);

            return interval;
        };

        const interval = animate();
        const loopInterval = setInterval(() => {
            animate();
        }, 7000);

        return () => {
            clearInterval(interval);
            clearInterval(loopInterval);
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-6 overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-2xl mb-4">
                    📖
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">AI generates your story</h3>
                <p className="text-sm text-zinc-400 mb-6">
                    Select a week, month, or year. Get a personalized narrative in your own voice with cover art.
                </p>

                {/* Story generation demo */}
                <div className="rounded-xl bg-black/40 border border-white/5 p-4">
                    <AnimatePresence mode="wait">
                        {!showStory ? (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-xs text-zinc-400">Generating story...</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-500"
                                        animate={{ width: `${progress}%` }}
                                    />
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="story"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-2"
                            >
                                <div className="flex gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-fuchsia-500/30 to-purple-500/30 flex items-center justify-center text-xl">
                                        🎨
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-fuchsia-400 mb-1">Your Week in Review</p>
                                        <p className="text-xs text-zinc-300 leading-relaxed truncate">
                                            "This week brought unexpected clarity..."
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
