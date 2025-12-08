"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const CURRENT_VERSION = "2.1";

const features = [
    {
        emoji: "🤖",
        title: "AI Coach",
        description: "Have meaningful conversations about your journaling patterns. Get personalized insights and support.",
        link: "/coach",
        linkText: "Try the Coach →",
        gradient: "from-indigo-500 to-purple-500",
    },
    {
        emoji: "📊",
        title: "Insights Dashboard",
        description: "Discover patterns in your mood and writing. See your streaks, trends, and personal growth over time.",
        link: "/insights",
        linkText: "See Insights →",
        gradient: "from-emerald-500 to-teal-500",
    },
    {
        emoji: "🔥",
        title: "Streaks & Companions",
        description: "Build your journaling habit with daily streaks. Unlock companions as you grow your practice.",
        gradient: "from-amber-500 to-orange-500",
    },
];

export default function WhatsNewModal() {
    const [show, setShow] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const lastSeenVersion = localStorage.getItem("whats_new_version");
        if (lastSeenVersion !== CURRENT_VERSION) {
            // Small delay to let the page load first
            const timeout = setTimeout(() => setShow(true), 1000);
            return () => clearTimeout(timeout);
        }
    }, []);

    function handleDismiss() {
        localStorage.setItem("whats_new_version", CURRENT_VERSION);
        setShow(false);
    }

    function nextSlide() {
        if (currentSlide < features.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleDismiss();
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
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-md"
                >
                    {/* Header */}
                    <div className="text-center mb-6">
                        <motion.p
                            initial={{ y: -10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-xs uppercase tracking-widest text-indigo-400 mb-2"
                        >
                            ✨ What&apos;s New
                        </motion.p>
                        <h2 className="text-2xl font-bold text-white">
                            OneLine just got better!
                        </h2>
                    </div>

                    {/* Feature Card */}
                    <motion.div
                        key={currentSlide}
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -50, opacity: 0 }}
                        className="rounded-2xl border border-white/10 bg-neutral-900/90 p-6 backdrop-blur"
                    >
                        {/* Emoji with gradient background */}
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl`}>
                            {feature.emoji}
                        </div>

                        <h3 className="text-xl font-semibold text-white text-center mb-2">
                            {feature.title}
                        </h3>

                        <p className="text-neutral-400 text-center text-sm mb-4">
                            {feature.description}
                        </p>

                        {feature.link && (
                            <Link
                                href={feature.link}
                                onClick={handleDismiss}
                                className={`block text-center text-sm font-medium bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent hover:opacity-80 transition`}
                            >
                                {feature.linkText}
                            </Link>
                        )}
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
                            onClick={handleDismiss}
                            className="flex-1 py-3 rounded-xl text-neutral-400 hover:text-white transition"
                        >
                            Skip
                        </button>
                        <button
                            onClick={nextSlide}
                            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
                        >
                            {isLast ? "Get Started! 🚀" : "Next"}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
