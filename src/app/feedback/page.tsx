"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Link from "next/link";

export default function FeedbackPage() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);

    // Form data
    const [overallRating, setOverallRating] = useState<number | null>(null);
    const [improvements, setImprovements] = useState<string>("");
    const [favoriteFeature, setFavoriteFeature] = useState<string>("");
    const [whyUseOneLine, setWhyUseOneLine] = useState<string>("");
    const [futureWishes, setFutureWishes] = useState<string>("");
    const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

    // Check if user has already submitted feedback recently
    useEffect(() => {
        async function checkPreviousFeedback() {
            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const lastFeedback = localStorage.getItem("last_feedback_date");
            if (lastFeedback) {
                const daysSince = (Date.now() - new Date(lastFeedback).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) {
                    setHasAlreadySubmitted(true);
                }
            }
        }
        checkPreviousFeedback();
    }, []);

    async function handleSubmit() {
        setLoading(true);
        try {
            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from("user_feedback").insert({
                user_id: user.id,
                overall_rating: overallRating,
                improvements: improvements.trim() || null,
                favorite_feature: favoriteFeature.trim() || null,
                why_use_oneline: whyUseOneLine.trim() || null,
                future_wishes: futureWishes.trim() || null,
                would_recommend: wouldRecommend,
                app_version: "2.0",
            });

            localStorage.setItem("last_feedback_date", new Date().toISOString());
            setSubmitted(true);
        } catch (e) {
            console.error("Failed to submit feedback:", e);
        } finally {
            setLoading(false);
        }
    }

    if (hasAlreadySubmitted) {
        return (
            <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <p className="text-6xl mb-4">💜</p>
                    <h1 className="text-2xl font-bold text-white mb-3">Thank you!</h1>
                    <p className="text-neutral-400 mb-6">
                        You&apos;ve already shared your feedback recently. We really appreciate your time!
                    </p>
                    <Link href="/today" className="text-indigo-400 hover:underline">
                        ← Back to OneLine
                    </Link>
                </div>
            </main>
        );
    }

    if (submitted) {
        return (
            <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-md"
                >
                    <p className="text-6xl mb-4">🎉</p>
                    <h1 className="text-2xl font-bold text-white mb-3">Thank you so much!</h1>
                    <p className="text-neutral-400 mb-6">
                        Your feedback means the world to us. We&apos;re a tiny team building OneLine with love,
                        and hearing from you helps us make it better for everyone.
                    </p>
                    <Link href="/today" className="inline-block px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition">
                        Continue to OneLine →
                    </Link>
                </motion.div>
            </main>
        );
    }

    const steps = [
        // Step 0: Welcome
        <motion.div key="welcome" className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-5xl mb-4">👋</p>
            <h1 className="text-2xl font-bold text-white mb-3">We&apos;d love to hear from you!</h1>
            <p className="text-neutral-400 mb-6">
                You&apos;re one of OneLine&apos;s earliest users, and your opinion really matters to us.
                This will only take 1-2 minutes.
            </p>
            <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
            >
                Sure, I&apos;ll share my thoughts! ✨
            </button>
            <p className="mt-4 text-sm text-neutral-500">
                <Link href="/today" className="hover:underline">Maybe later</Link>
            </p>
        </motion.div>,

        // Step 1: Overall rating
        <motion.div key="rating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4 text-center">How would you rate OneLine overall?</p>
            <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3, 4, 5].map(rating => (
                    <button
                        key={rating}
                        onClick={() => setOverallRating(rating)}
                        className={`w-14 h-14 rounded-xl text-2xl transition ${overallRating === rating
                                ? "bg-indigo-600 scale-110"
                                : "bg-neutral-800 hover:bg-neutral-700"
                            }`}
                    >
                        {rating === 1 ? "😔" : rating === 2 ? "😕" : rating === 3 ? "😐" : rating === 4 ? "🙂" : "😍"}
                    </button>
                ))}
            </div>
            <div className="flex justify-between text-xs text-neutral-500 px-2 mb-6">
                <span>Not great</span>
                <span>Love it!</span>
            </div>
            <button
                onClick={() => setStep(2)}
                disabled={overallRating === null}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
                Next
            </button>
        </motion.div>,

        // Step 2: Favorite feature
        <motion.div key="favorite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4">What&apos;s your favorite thing about OneLine?</p>
            <div className="space-y-2 mb-6">
                {["The daily journaling", "AI Coach", "Year Stories", "Privacy & encryption", "The simple design", "Seeing my streaks"].map(option => (
                    <button
                        key={option}
                        onClick={() => setFavoriteFeature(option)}
                        className={`w-full p-3 rounded-xl text-left transition ${favoriteFeature === option
                                ? "bg-indigo-600 text-white"
                                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                            }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            <button
                onClick={() => setStep(3)}
                disabled={!favoriteFeature}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
                Next
            </button>
        </motion.div>,

        // Step 3: Why use OneLine
        <motion.div key="why" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4">Why do you keep using OneLine?</p>
            <p className="text-sm text-neutral-500 mb-3">Be as honest as you want — this helps us a lot!</p>
            <textarea
                value={whyUseOneLine}
                onChange={(e) => setWhyUseOneLine(e.target.value)}
                placeholder="It helps me remember my days... / I like reflecting on my thoughts... / The encryption makes me feel safe..."
                className="w-full h-28 p-4 rounded-xl bg-neutral-800 text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={() => setStep(4)}
                className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
            >
                {whyUseOneLine.trim() ? "Next" : "Skip"}
            </button>
        </motion.div>,

        // Step 4: Improvements
        <motion.div key="improve" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4">What could be better?</p>
            <p className="text-sm text-neutral-500 mb-3">We&apos;re always improving. Your ideas shape OneLine&apos;s future.</p>
            <textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="I wish there was... / It would be nice if... / Sometimes I struggle with..."
                className="w-full h-28 p-4 rounded-xl bg-neutral-800 text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={() => setStep(5)}
                className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
            >
                {improvements.trim() ? "Next" : "Skip"}
            </button>
        </motion.div>,

        // Step 5: Future wishes
        <motion.div key="future" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4">What would you love to see in OneLine?</p>
            <p className="text-sm text-neutral-500 mb-3">Dream big! What features would make OneLine perfect for you?</p>
            <textarea
                value={futureWishes}
                onChange={(e) => setFutureWishes(e.target.value)}
                placeholder="A mobile app... / Tags for entries... / Weekly insights..."
                className="w-full h-28 p-4 rounded-xl bg-neutral-800 text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={() => setStep(6)}
                className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
            >
                {futureWishes.trim() ? "Next" : "Skip"}
            </button>
        </motion.div>,

        // Step 6: Recommend
        <motion.div key="recommend" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-6 text-center">Would you recommend OneLine to a friend?</p>
            <div className="flex gap-4 justify-center mb-6">
                <button
                    onClick={() => setWouldRecommend(true)}
                    className={`px-8 py-4 rounded-xl text-lg transition ${wouldRecommend === true
                            ? "bg-emerald-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    Yes! 👍
                </button>
                <button
                    onClick={() => setWouldRecommend(false)}
                    className={`px-8 py-4 rounded-xl text-lg transition ${wouldRecommend === false
                            ? "bg-neutral-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    Not yet
                </button>
            </div>
            <button
                onClick={handleSubmit}
                disabled={wouldRecommend === null || loading}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
                {loading ? "Sending..." : "Submit Feedback 🚀"}
            </button>
        </motion.div>,
    ];

    return (
        <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                {/* Progress */}
                {step > 0 && (
                    <div className="flex justify-center gap-1 mb-8">
                        {[1, 2, 3, 4, 5, 6].map(s => (
                            <div
                                key={s}
                                className={`w-8 h-1 rounded-full ${s <= step ? "bg-indigo-500" : "bg-neutral-800"}`}
                            />
                        ))}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {steps[step]}
                </AnimatePresence>
            </div>
        </main>
    );
}
