"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useVault } from "@/hooks/useVault";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { isSupabaseConfigured } from "@/lib/supabaseBrowser";

const TOUR_SEEN_KEY = "oneline:welcome-tour:completed";

type TourStep = {
    icon: string;
    title: string;
    description: string;
    highlight?: string;
    action?: { label: string; href: string };
};

const TOUR_STEPS: TourStep[] = [
    {
        icon: "👋",
        title: "Welcome to OneLine",
        description: "This isn't just another notes app. OneLine is designed to help you build a lasting reflection habit with just one line a day.",
        highlight: "Your brain forgets 80% of what happens each day. We help you capture what matters.",
    },
    {
        icon: "✍️",
        title: "Write One Line Daily",
        description: "Each day, write just 333 characters about what happened. That's about 2-3 sentences. Short enough to do before bed, long enough to be meaningful.",
        highlight: "Most users spend less than 30 seconds. It's designed to be effortless.",
    },
    {
        icon: "🔐",
        title: "End-to-End Encrypted",
        description: "Your passphrase encrypts everything on your device before it ever reaches our servers. We literally cannot read your entries.",
        highlight: "If you lose your passphrase, your entries stay sealed forever. That's the point.",
    },
    {
        icon: "🔥",
        title: "Build Your Streak",
        description: "Stay consistent with streaks, companions that unlock at milestones, and gentle reminders. No pressure, just momentum.",
        highlight: "Users with 7+ day streaks are 92% more likely to keep journaling for a month.",
    },
    {
        icon: "📖",
        title: "AI-Generated Stories",
        description: "After a week or month, generate a personalized narrative from your entries. See your life from a new perspective, in your own voice.",
        highlight: "It's like having a personal biographer summarizing your journey.",
        action: { label: "Try Summaries", href: "/summaries" },
    },
    {
        icon: "📊",
        title: "Track Your Mood & Patterns",
        description: "Optional mood tracking helps you spot patterns. See which days lift you up and which drain you. Discover what really matters.",
        action: { label: "View Insights", href: "/insights" },
    },
    {
        icon: "🚀",
        title: "You're All Set!",
        description: "That's everything! Start with your first line today. Remember: done is better than perfect. Write something honest, even if it's small.",
        highlight: "Your future self will thank you for starting today.",
        action: { label: "Write Your First Entry", href: "/today" },
    },
];

export function WelcomeTour() {
    const { dataKey } = useVault();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isReady, setIsReady] = useState(false);

    // Check if user should see the tour (first time after vault creation)
    useEffect(() => {
        let cancelled = false;

        async function checkTourStatus() {
            // Wait for vault to be unlocked
            if (!dataKey) {
                setIsReady(true);
                return;
            }

            // Check if already seen
            const hasSeenLocal = typeof window !== "undefined" && localStorage.getItem(TOUR_SEEN_KEY);

            if (hasSeenLocal) {
                setIsReady(true);
                setIsOpen(false);
                return;
            }

            // Check user metadata for remote flag
            if (isSupabaseConfigured()) {
                try {
                    const supabase = supabaseBrowser();
                    const { data: { user } } = await supabase.auth.getUser();

                    if (cancelled) return;

                    const hasSeenRemote = user?.user_metadata?.welcome_tour_completed;

                    if (hasSeenRemote) {
                        // Sync to local
                        if (typeof window !== "undefined") {
                            localStorage.setItem(TOUR_SEEN_KEY, "true");
                        }
                        setIsReady(true);
                        setIsOpen(false);
                        return;
                    }

                    // First time! Show the tour
                    setIsReady(true);
                    setIsOpen(true);
                } catch {
                    setIsReady(true);
                }
            } else {
                setIsReady(true);
                setIsOpen(true);
            }
        }

        checkTourStatus();

        return () => { cancelled = true; };
    }, [dataKey]);

    const completeTour = useCallback(async () => {
        // Mark as completed locally
        if (typeof window !== "undefined") {
            localStorage.setItem(TOUR_SEEN_KEY, "true");
        }

        // Mark as completed remotely
        if (isSupabaseConfigured()) {
            try {
                const supabase = supabaseBrowser();
                await supabase.auth.updateUser({
                    data: { welcome_tour_completed: true, welcome_tour_completed_at: new Date().toISOString() }
                });
            } catch (err) {
                console.error("[WelcomeTour] Failed to sync completion:", err);
            }
        }

        setIsOpen(false);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            completeTour();
        }
    }, [currentStep, completeTour]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    }, [currentStep]);

    const skipTour = useCallback(() => {
        completeTour();
    }, [completeTour]);

    if (!isReady || !isOpen) {
        return null;
    }

    const step = TOUR_STEPS[currentStep];
    const isLastStep = currentStep === TOUR_STEPS.length - 1;
    const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                        onClick={skipTour}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 sm:inset-x-auto"
                    >
                        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 shadow-2xl">
                            {/* Gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-fuchsia-500/10" />

                            {/* Progress bar */}
                            <div className="absolute inset-x-0 top-0 h-1 bg-neutral-800">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <div className="relative p-6 sm:p-8">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <motion.span
                                            key={currentStep}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 text-3xl"
                                        >
                                            {step.icon}
                                        </motion.span>
                                        <div>
                                            <p className="text-xs text-neutral-500">Step {currentStep + 1} of {TOUR_STEPS.length}</p>
                                            <motion.h2
                                                key={`title-${currentStep}`}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="text-xl font-bold text-white"
                                            >
                                                {step.title}
                                            </motion.h2>
                                        </div>
                                    </div>
                                    <button
                                        onClick={skipTour}
                                        className="rounded-full p-2 text-neutral-500 transition hover:bg-white/10 hover:text-white"
                                        aria-label="Skip tour"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Content */}
                                <motion.div
                                    key={`content-${currentStep}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="mt-6 space-y-4"
                                >
                                    <p className="text-base leading-relaxed text-neutral-300">
                                        {step.description}
                                    </p>

                                    {step.highlight && (
                                        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                                            <p className="text-sm font-medium text-indigo-200">
                                                💡 {step.highlight}
                                            </p>
                                        </div>
                                    )}

                                    {step.action && (
                                        <Link
                                            href={step.action.href}
                                            onClick={completeTour}
                                            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                                        >
                                            {step.action.label}
                                            <span>→</span>
                                        </Link>
                                    )}
                                </motion.div>

                                {/* Step indicators */}
                                <div className="mt-6 flex justify-center gap-1.5">
                                    {TOUR_STEPS.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentStep(i)}
                                            className={`h-2 rounded-full transition-all ${i === currentStep
                                                    ? "w-6 bg-indigo-500"
                                                    : i < currentStep
                                                        ? "w-2 bg-indigo-500/50"
                                                        : "w-2 bg-neutral-700"
                                                }`}
                                            aria-label={`Go to step ${i + 1}`}
                                        />
                                    ))}
                                </div>

                                {/* Navigation */}
                                <div className="mt-6 flex items-center justify-between">
                                    <button
                                        onClick={prevStep}
                                        disabled={currentStep === 0}
                                        className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-400 transition hover:text-white disabled:opacity-30"
                                    >
                                        ← Back
                                    </button>

                                    <button
                                        onClick={skipTour}
                                        className="text-xs text-neutral-500 hover:text-neutral-300"
                                    >
                                        Skip tour
                                    </button>

                                    <button
                                        onClick={nextStep}
                                        className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-indigo-500/25"
                                    >
                                        {isLastStep ? "Get Started" : "Next →"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
