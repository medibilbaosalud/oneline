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
    const [noticedImprovement, setNoticedImprovement] = useState<string | null>(null);
    const [favoriteFeature, setFavoriteFeature] = useState<string>("");
    const [triedCoach, setTriedCoach] = useState<boolean | null>(null);
    const [coachRating, setCoachRating] = useState<number | null>(null);
    const [coachInterest, setCoachInterest] = useState<string | null>(null);
    const [oneImprovement, setOneImprovement] = useState<string>("");
    const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkPreviousFeedback() {
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

            await supabase.from("user_overall_feedback").insert({
                user_id: user.id,
                overall_rating: overallRating,
                noticed_improvement: noticedImprovement,
                favorite_feature: favoriteFeature.trim() || null,
                tried_coach: triedCoach,
                coach_rating: coachRating,
                coach_interest: coachInterest,
                one_improvement: oneImprovement.trim() || null,
                would_recommend: wouldRecommend,
                app_version: "2.1",
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
                You&apos;re one of OneLine&apos;s earliest users, and your voice shapes our future.
                This takes about 1 minute.
            </p>
            <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
            >
                Let&apos;s do it! ✨
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

        // Step 2: Noticed improvement?
        <motion.div key="improvement" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4 text-center">Have you noticed OneLine getting better lately?</p>
            <p className="text-sm text-neutral-500 mb-4 text-center">We&apos;ve been working hard on new features!</p>
            <div className="flex justify-center gap-4 mb-6">
                <button
                    onClick={() => setNoticedImprovement("no")}
                    className={`px-6 py-4 rounded-xl text-lg transition ${noticedImprovement === "no"
                            ? "bg-neutral-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    👎 No
                </button>
                <button
                    onClick={() => setNoticedImprovement("not_sure")}
                    className={`px-6 py-4 rounded-xl text-lg transition ${noticedImprovement === "not_sure"
                            ? "bg-amber-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    🤷 Not sure
                </button>
                <button
                    onClick={() => setNoticedImprovement("yes")}
                    className={`px-6 py-4 rounded-xl text-lg transition ${noticedImprovement === "yes"
                            ? "bg-emerald-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    👍 Yes!
                </button>
            </div>
            <button
                onClick={() => setStep(3)}
                disabled={noticedImprovement === null}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
                Next
            </button>
        </motion.div>,

        // Step 3: Favorite feature
        <motion.div key="favorite" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4">What&apos;s your favorite thing about OneLine?</p>
            <div className="space-y-2 mb-6">
                {["Daily journaling", "AI Coach 🤖", "Insights & patterns", "Year Stories", "Privacy & encryption", "The simple design", "Streaks & momentum"].map(option => (
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
                onClick={() => setStep(4)}
                disabled={!favoriteFeature}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
                Next
            </button>
        </motion.div>,

        // Step 4: AI Coach experience
        <motion.div key="coach" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-4 text-center">Have you tried the AI Coach?</p>
            <div className="flex justify-center gap-4 mb-6">
                <button
                    onClick={() => { setTriedCoach(false); setCoachRating(null); }}
                    className={`px-8 py-4 rounded-xl text-lg transition ${triedCoach === false
                            ? "bg-neutral-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    Not yet
                </button>
                <button
                    onClick={() => { setTriedCoach(true); setCoachInterest(null); }}
                    className={`px-8 py-4 rounded-xl text-lg transition ${triedCoach === true
                            ? "bg-indigo-600 text-white scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                        }`}
                >
                    Yes! 🤖
                </button>
            </div>

            {/* Sub-question based on answer */}
            {triedCoach === true && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                    <p className="text-sm text-neutral-400 mb-3 text-center">How useful was it?</p>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(rating => (
                            <button
                                key={rating}
                                onClick={() => setCoachRating(rating)}
                                className={`w-12 h-12 rounded-lg text-xl transition ${coachRating === rating
                                        ? "bg-indigo-600 scale-110"
                                        : "bg-neutral-800 hover:bg-neutral-700"
                                    }`}
                            >
                                {rating === 1 ? "😕" : rating === 2 ? "😐" : rating === 3 ? "🙂" : rating === 4 ? "😊" : "🤩"}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {triedCoach === false && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                    <p className="text-sm text-neutral-400 mb-3 text-center">Would you like to try it?</p>
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => setCoachInterest("curious")}
                            className={`px-4 py-2 rounded-lg text-sm transition ${coachInterest === "curious"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                }`}
                        >
                            Curious to try! ✨
                        </button>
                        <button
                            onClick={() => setCoachInterest("not_interested")}
                            className={`px-4 py-2 rounded-lg text-sm transition ${coachInterest === "not_interested"
                                    ? "bg-neutral-600 text-white"
                                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                }`}
                        >
                            Not really
                        </button>
                    </div>
                </motion.div>
            )}

            <button
                onClick={() => setStep(5)}
                disabled={triedCoach === null || (triedCoach === true && coachRating === null) || (triedCoach === false && coachInterest === null)}
                className="w-full mt-6 py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
            >
                Next
            </button>
        </motion.div>,

        // Step 5: One improvement (focused)
        <motion.div key="improve" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-lg text-white mb-2">What&apos;s ONE thing you wish OneLine did better?</p>
            <p className="text-sm text-neutral-500 mb-4">Be specific — this helps us prioritize!</p>
            <textarea
                value={oneImprovement}
                onChange={(e) => setOneImprovement(e.target.value)}
                placeholder="I wish it had... / It would be better if... / Sometimes I struggle with..."
                className="w-full h-24 p-4 rounded-xl bg-neutral-800 text-white placeholder-neutral-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
                onClick={() => setStep(6)}
                className="w-full mt-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
            >
                {oneImprovement.trim() ? "Next" : "Skip"}
            </button>
        </motion.div>,

        // Step 6: Recommend (NPS)
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
                                className={`w-8 h-1 rounded-full transition-colors ${s <= step ? "bg-indigo-500" : "bg-neutral-800"}`}
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
