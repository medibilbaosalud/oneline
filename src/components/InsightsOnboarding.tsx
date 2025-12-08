"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const features = [
    {
        emoji: "📈",
        title: "Mood Trends",
        description: "See how your mood changes over time. Discover patterns and understand what affects how you feel.",
    },
    {
        emoji: "📅",
        title: "Writing Patterns",
        description: "Track when you write most often. See which days you're most reflective and build consistent habits.",
    },
    {
        emoji: "🔥",
        title: "Streaks & Fire Level",
        description: "Build your journaling streak! The more consecutive days you write, the higher your fire level grows.",
    },
];

export default function InsightsOnboarding({ onComplete }: { onComplete: () => void }) {
    const [show, setShow] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const hasSeen = localStorage.getItem("insights_onboarding_seen");
        if (!hasSeen) {
            setShow(true);
        }
    }, []);

    function handleComplete() {
        localStorage.setItem("insights_onboarding_seen", "true");
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

    if (!show) return null;

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
                            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl"
                        >
                            📊
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white">
                            Your Insights
                        </h2>
                        <p className="text-neutral-400 mt-1">
                            Discover patterns in your journaling
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
                                        ? "bg-emerald-500 w-6"
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
                            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition"
                        >
                            {isLast ? "Let's explore! ✨" : "Next"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
