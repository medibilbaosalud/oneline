"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVault } from "@/hooks/useVault";

const features = [
    {
        emoji: "💬",
        title: "Have a Conversation",
        description: "Chat with your AI Coach about your feelings, patterns, or anything on your mind. It's like having a thoughtful friend who never judges.",
    },
    {
        emoji: "📚",
        title: "With History",
        description: "Toggle 'With History' to let the Coach remember your previous conversations and provide more personalized insights.",
    },
    {
        emoji: "✅",
        title: "Finish Chat",
        description: "When you're done, click 'Finish Chat' to save insights to your profile and start fresh next time.",
    },
    {
        emoji: "🕐",
        title: "History",
        description: "Browse your past conversations anytime. Your chats are saved so you can revisit them whenever you want.",
    },
];

export default function CoachOnboarding({ onComplete }: { onComplete: () => void }) {
    const [show, setShow] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const { dataKey } = useVault();

    useEffect(() => {
        if (!dataKey) return;

        const hasSeen = localStorage.getItem("coach_onboarding_seen");
        if (!hasSeen) {
            setShow(true);
        }
    }, [dataKey]);

    function handleComplete() {
        localStorage.setItem("coach_onboarding_seen", "true");
        setShow(false);
        onComplete();
    }

    function nextSlide() {
        if (currentSlide < features.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleComplete();
        }
    }

    if (!show || !dataKey) return null;

    const feature = features[currentSlide];
    const isLast = currentSlide === features.length - 1;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl"
                        >
                            🤖
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white">
                            Welcome to AI Coach
                        </h2>
                        <p className="text-neutral-400 mt-1">
                            Your personal companion for reflection
                        </p>
                    </div>

                    {/* Feature Card */}
                    <motion.div
                        key={currentSlide}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="rounded-2xl border border-white/10 bg-neutral-900/90 p-6 backdrop-blur"
                    >
                        <div className="text-center">
                            <span className="text-4xl mb-4 block">{feature.emoji}</span>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-neutral-400 text-sm">
                                {feature.description}
                            </p>
                        </div>
                    </motion.div>

                    {/* Progress dots */}
                    <div className="flex justify-center gap-2 mt-6 mb-4">
                        {features.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === currentSlide
                                    ? "bg-indigo-500 w-6"
                                    : "bg-neutral-600 hover:bg-neutral-500"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleComplete}
                            className="flex-1 py-3 rounded-xl text-neutral-400 hover:text-white transition"
                        >
                            Skip
                        </button>
                        <button
                            onClick={nextSlide}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
                        >
                            {isLast ? "Got it! 🚀" : "Next"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
