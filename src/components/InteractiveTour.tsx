"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useVault } from "@/hooks/useVault";
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabaseBrowser";

const TOUR_COMPLETED_KEY = "oneline:interactive-tour:completed";
const VISITOR_TOUR_KEY = "oneline:visitor-tour:completed";

// Tour step definition
export type TourStep = {
    id: string;
    target?: string; // CSS selector for the element to highlight
    title: string;
    content: string;
    placement?: "top" | "bottom" | "left" | "right" | "center";
    page?: string; // Route where this step should show
    action?: { label: string; onClick?: () => void };
    spotlightPadding?: number;
};

// Tour context
type TourContextType = {
    isActive: boolean;
    currentStep: number;
    steps: TourStep[];
    startTour: () => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (index: number) => void;
};

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error("useTour must be used within TourProvider");
    }
    return context;
}

// Tour steps configuration
const TOUR_STEPS: TourStep[] = [
    // Welcome
    {
        id: "welcome",
        title: "Welcome to OneLine! 👋",
        content: "Let me show you around. This interactive tour will guide you through every part of the app. Takes about 2 minutes.",
        placement: "center",
        page: "/today",
    },
    // Today page - Entry area
    {
        id: "entry-area",
        target: "textarea",
        title: "Write Your Daily Entry ✍️",
        content: "This is where the magic happens. Write 2-3 sentences about your day — what happened, how you felt, what you learned. Keep it honest.",
        placement: "bottom",
        page: "/today",
        spotlightPadding: 8,
    },
    // Character counter
    {
        id: "char-counter",
        target: "[class*='text-xs'][class*='font-medium']",
        title: "333 Character Limit",
        content: "Short by design. This limit removes the pressure to write a novel. Most users finish in under 30 seconds.",
        placement: "top",
        page: "/today",
    },
    // Save button
    {
        id: "save-button",
        target: "button[class*='from-indigo-500']",
        title: "Save & Encrypt",
        content: "When you hit save, your entry is encrypted on your device before it ever reaches our servers. We literally cannot read it.",
        placement: "top",
        page: "/today",
    },
    // Streak card
    {
        id: "streak-card",
        target: "[class*='border-orange-500']",
        title: "Your Streak 🔥",
        content: "Consistency is everything. Your streak tracks consecutive days of journaling. Miss a day? No judgment — just start again.",
        placement: "left",
        page: "/today",
        spotlightPadding: 12,
    },
    // Mood selector
    {
        id: "mood-selector",
        target: "[class*='Mood:']",
        title: "Track Your Mood",
        content: "Optional but powerful. Logging your mood helps you spot patterns — which days lift you up and which drain you.",
        placement: "top",
        page: "/today",
    },
    // Navigation - Insights
    {
        id: "nav-insights",
        target: "a[href='/insights']",
        title: "Insights Tab 📊",
        content: "Click here to see patterns in your journaling. We'll analyze your streaks, moods, and writing habits.",
        placement: "bottom",
        page: "/today",
        action: { label: "Go to Insights" },
    },
    // Insights page
    {
        id: "insights-overview",
        title: "Your Insights Dashboard",
        content: "This is your personal analytics. See how consistent you've been, track mood trends, and discover patterns you might have missed.",
        placement: "center",
        page: "/insights",
    },
    // Navigation - History
    {
        id: "nav-history",
        target: "a[href='/history']",
        title: "History Tab 📅",
        content: "View all your past entries here. They're encrypted, but unlock instantly when you have your vault open.",
        placement: "bottom",
        page: "/insights",
        action: { label: "Go to History" },
    },
    // History page
    {
        id: "history-overview",
        title: "Your Entry History",
        content: "Scroll through all your past reflections. Each entry is encrypted — servers only see ciphertext until your vault unlocks it locally.",
        placement: "center",
        page: "/history",
    },
    // Navigation - Summaries
    {
        id: "nav-summaries",
        target: "a[href='/summaries']",
        title: "Summaries Tab 📖",
        content: "This is the game-changer. AI generates personalized stories from your entries — weekly, monthly, or yearly.",
        placement: "bottom",
        page: "/history",
        action: { label: "Go to Summaries" },
    },
    // Summaries page
    {
        id: "summaries-overview",
        title: "AI-Generated Stories ✨",
        content: "After a week of journaling, you can generate a narrative summary. It reads your entries (decrypted locally), then creates a story in your voice.",
        placement: "center",
        page: "/summaries",
    },
    // Navigation - Settings
    {
        id: "nav-settings",
        target: "a[href='/settings']",
        title: "Settings ⚙️",
        content: "Customize your experience. Change reminders, export your data, manage your vault, and more.",
        placement: "bottom",
        page: "/summaries",
        action: { label: "Go to Settings" },
    },
    // Settings page
    {
        id: "settings-overview",
        title: "Your Settings",
        content: "Here you control everything. Export your journal, change preferences, and manage your encryption. Your data, your rules.",
        placement: "center",
        page: "/settings",
    },
    // Final - Back to Today
    {
        id: "tour-complete",
        title: "You're Ready! 🚀",
        content: "That's the full tour. Now go write your first entry. Remember: one honest line a day is enough. Your future self will thank you.",
        placement: "center",
        page: "/settings",
        action: { label: "Start Writing" },
    },
];

// Tour Provider Component
export function TourProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { dataKey } = useVault();
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [hasChecked, setHasChecked] = useState(false);
    const [isVisitorMode, setIsVisitorMode] = useState(false);

    // Check if visitor mode
    useEffect(() => {
        if (typeof window !== "undefined") {
            const visitorMode = localStorage.getItem("oneline:visitor-mode") === "true";
            setIsVisitorMode(visitorMode);
        }
    }, []);

    // Check if tour should auto-start - ONLY on /today page when ready
    useEffect(() => {
        if (hasChecked) return;

        // Only auto-start tour on /today page
        if (pathname !== "/today") return;

        // Need either dataKey (authenticated + vault unlocked) or visitor mode to show tour
        if (!dataKey && !isVisitorMode) return;

        async function checkTourStatus() {
            // Check for visitor mode tour completion
            if (isVisitorMode) {
                const hasSeenVisitorTour = typeof window !== "undefined" && localStorage.getItem(VISITOR_TOUR_KEY);
                if (hasSeenVisitorTour) {
                    setHasChecked(true);
                    return;
                }
                // First time visitor - start tour!
                setHasChecked(true);
                setIsActive(true);
                return;
            }

            // Regular user: Check if they have ANY entries
            // Logic: If user has entries, they don't need the tour, even if they never "completed" it.
            if (isSupabaseConfigured()) {
                try {
                    const supabase = supabaseBrowser();

                    // 1. Check metadata first (fastest)
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.user_metadata?.interactive_tour_completed) {
                        setHasChecked(true);
                        return;
                    }

                    // 2. Check actual usage (entries count)
                    const { count, error } = await supabase
                        .from('journal')
                        .select('*', { count: 'exact', head: true });

                    if (!error && count !== null && count > 0) {
                        // User has entries -> Treat as educated user -> mark complete locally
                        if (typeof window !== "undefined") {
                            localStorage.setItem(TOUR_COMPLETED_KEY, "true");
                        }
                        setHasChecked(true);
                        // Optionally backend sync could happen here but let's just silence the tour
                        return;
                    }
                } catch {
                    // If check fails, fall back to showing it if local storage says so, or not.
                    // Safer to just allow flow to continue to local check.
                }
            }

            // 3. Last check: Local storage for "dismissed" state
            const hasSeenLocal = typeof window !== "undefined" && localStorage.getItem(TOUR_COMPLETED_KEY);
            if (hasSeenLocal) {
                setHasChecked(true);
                return;
            }

            // User has 0 entries and hasn't seen/dismissed tour -> Start it!
            setHasChecked(true);
            setIsActive(true);
        }

        checkTourStatus();
    }, [dataKey, hasChecked, isVisitorMode, pathname]);

    // Navigate to step's page if needed
    useEffect(() => {
        if (!isActive) return;

        const step = TOUR_STEPS[currentStep];
        if (step?.page && pathname !== step.page) {
            router.push(step.page);
        }
    }, [isActive, currentStep, pathname, router]);

    const startTour = useCallback(() => {
        setCurrentStep(0);
        setIsActive(true);
        router.push("/today");
    }, [router]);

    const endTour = useCallback(async () => {
        setIsActive(false);

        // Mark as completed based on mode
        if (typeof window !== "undefined") {
            if (isVisitorMode) {
                localStorage.setItem(VISITOR_TOUR_KEY, "true");
            } else {
                localStorage.setItem(TOUR_COMPLETED_KEY, "true");
            }
        }

        // Only sync to Supabase for authenticated users
        if (!isVisitorMode && isSupabaseConfigured()) {
            try {
                const supabase = supabaseBrowser();
                await supabase.auth.updateUser({
                    data: {
                        interactive_tour_completed: true,
                        interactive_tour_completed_at: new Date().toISOString()
                    }
                });
            } catch (err) {
                console.error("[Tour] Failed to sync:", err);
            }
        }
    }, [isVisitorMode]);

    const nextStep = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            const nextStepData = TOUR_STEPS[currentStep + 1];

            // Navigate if needed
            if (nextStepData.page && pathname !== nextStepData.page) {
                router.push(nextStepData.page);
            }

            setCurrentStep(s => s + 1);
        } else {
            endTour();
            router.push("/today");
        }
    }, [currentStep, pathname, router, endTour]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            const prevStepData = TOUR_STEPS[currentStep - 1];

            if (prevStepData.page && pathname !== prevStepData.page) {
                router.push(prevStepData.page);
            }

            setCurrentStep(s => s - 1);
        }
    }, [currentStep, pathname, router]);

    const goToStep = useCallback((index: number) => {
        if (index >= 0 && index < TOUR_STEPS.length) {
            setCurrentStep(index);
        }
    }, []);

    return (
        <TourContext.Provider
            value={{
                isActive,
                currentStep,
                steps: TOUR_STEPS,
                startTour,
                endTour,
                nextStep,
                prevStep,
                goToStep,
            }}
        >
            {children}
            <TourOverlay />
        </TourContext.Provider>
    );
}

// Spotlight and tooltip overlay
function TourOverlay() {
    const { isActive, currentStep, steps, endTour, nextStep, prevStep } = useTour();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const step = steps[currentStep];
    const isCenter = step?.placement === "center" || !step?.target;
    const isLastStep = currentStep === steps.length - 1;

    // Find and track target element
    useEffect(() => {
        if (!isActive || !step?.target) {
            setTargetRect(null);
            return;
        }

        function updateTargetRect() {
            const element = document.querySelector(step.target!);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
            }
        }

        // Initial find with delay for page transitions
        const timeout = setTimeout(updateTargetRect, 300);

        // Update on scroll/resize
        window.addEventListener("scroll", updateTargetRect, true);
        window.addEventListener("resize", updateTargetRect);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("scroll", updateTargetRect, true);
            window.removeEventListener("resize", updateTargetRect);
        };
    }, [isActive, step]);

    if (!isActive) return null;

    const padding = step?.spotlightPadding ?? 8;
    const spotlightStyle = targetRect ? {
        top: targetRect.top - padding,
        left: targetRect.left - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
    } : null;

    // Calculate tooltip position
    const getTooltipPosition = () => {
        if (isCenter || !targetRect) {
            return {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        const placement = step?.placement ?? "bottom";
        const gap = 16;

        switch (placement) {
            case "top":
                return {
                    bottom: `${window.innerHeight - targetRect.top + gap}px`,
                    left: `${targetRect.left + targetRect.width / 2}px`,
                    transform: "translateX(-50%)",
                };
            case "bottom":
                return {
                    top: `${targetRect.bottom + gap}px`,
                    left: `${targetRect.left + targetRect.width / 2}px`,
                    transform: "translateX(-50%)",
                };
            case "left":
                return {
                    top: `${targetRect.top + targetRect.height / 2}px`,
                    right: `${window.innerWidth - targetRect.left + gap}px`,
                    transform: "translateY(-50%)",
                };
            case "right":
                return {
                    top: `${targetRect.top + targetRect.height / 2}px`,
                    left: `${targetRect.right + gap}px`,
                    transform: "translateY(-50%)",
                };
            default:
                return {};
        }
    };

    const progress = ((currentStep + 1) / steps.length) * 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999]"
            >
                {/* Dark overlay with spotlight cutout */}
                <svg className="absolute inset-0 h-full w-full">
                    <defs>
                        <mask id="spotlight-mask">
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {spotlightStyle && (
                                <motion.rect
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    x={spotlightStyle.left}
                                    y={spotlightStyle.top}
                                    width={spotlightStyle.width}
                                    height={spotlightStyle.height}
                                    rx="12"
                                    fill="black"
                                />
                            )}
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(0, 0, 0, 0.85)"
                        mask="url(#spotlight-mask)"
                    />
                </svg>

                {/* Spotlight border glow */}
                {spotlightStyle && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute rounded-xl border-2 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                        style={{
                            top: spotlightStyle.top,
                            left: spotlightStyle.left,
                            width: spotlightStyle.width,
                            height: spotlightStyle.height,
                        }}
                    />
                )}

                {/* Tooltip */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-10 w-[90vw] max-w-md"
                    style={getTooltipPosition()}
                >
                    <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
                        {/* Progress */}
                        <div className="mb-4 flex items-center gap-3">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-800">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-xs text-neutral-500">{currentStep + 1}/{steps.length}</span>
                        </div>

                        {/* Content */}
                        <h3 className="text-lg font-bold text-white">{step?.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-neutral-300">{step?.content}</p>

                        {/* Navigation */}
                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={prevStep}
                                    disabled={currentStep === 0}
                                    className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 hover:text-white disabled:opacity-30"
                                >
                                    ← Back
                                </button>
                                <button
                                    onClick={endTour}
                                    className="text-xs text-neutral-500 hover:text-neutral-300"
                                >
                                    Skip tour
                                </button>
                            </div>

                            <button
                                onClick={nextStep}
                                className="rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg"
                            >
                                {isLastStep ? "Finish Tour" : "Next →"}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Button to restart tour
export function RestartTourButton() {
    const { startTour } = useTour();

    return (
        <button
            onClick={startTour}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
            <span>🎯</span>
            Show the tour again
        </button>
    );
}
