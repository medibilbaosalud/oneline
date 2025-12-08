"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function FeedbackBanner() {
    const [show, setShow] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        async function checkEligibility() {
            // Check localStorage first for quick dismissal check
            const lastDismiss = localStorage.getItem("feedback_banner_dismissed");
            if (lastDismiss) {
                const daysSince = (Date.now() - new Date(lastDismiss).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince < 14) { // Don't show for 14 days after dismissal
                    return;
                }
            }

            const lastFeedback = localStorage.getItem("last_feedback_date");
            if (lastFeedback) {
                const daysSince = (Date.now() - new Date(lastFeedback).getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) { // Already gave feedback recently
                    return;
                }
            }

            // Check if user has been active for at least 3 days
            try {
                const supabase = supabaseBrowser();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: streak } = await supabase
                    .from("user_streaks")
                    .select("total_entries")
                    .eq("user_id", user.id)
                    .single();

                // Show if they have at least 3 entries (active user)
                if (streak && (streak.total_entries || 0) >= 3) {
                    setShow(true);
                }
            } catch (e) {
                console.error("[FeedbackBanner] Error checking eligibility:", e);
            }
        }

        // Small delay to not distract from main content
        const timeout = setTimeout(checkEligibility, 2000);
        return () => clearTimeout(timeout);
    }, []);

    function handleDismiss() {
        localStorage.setItem("feedback_banner_dismissed", new Date().toISOString());
        setDismissed(true);
    }

    if (!show || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 p-4"
            >
                <div className="flex items-start gap-4">
                    <span className="text-2xl">💜</span>
                    <div className="flex-1">
                        <p className="font-medium text-white">
                            You&apos;re one of OneLine&apos;s first users!
                        </p>
                        <p className="text-sm text-neutral-300 mt-1">
                            We&apos;d love to hear what you think. Your feedback shapes OneLine&apos;s future.
                        </p>
                        <div className="flex gap-3 mt-3">
                            <Link
                                href="/feedback"
                                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
                            >
                                Share your thoughts ✨
                            </Link>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 rounded-lg text-neutral-400 text-sm hover:text-white transition"
                            >
                                Maybe later
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-neutral-500 hover:text-white"
                    >
                        ×
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
