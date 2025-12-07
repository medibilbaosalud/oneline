// src/components/engagement/ReflectionModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ReflectionModalProps = {
    isOpen: boolean;
    onClose: () => void;
    reflection: {
        date: string;
        insight: string;
        question: string;
    } | null;
    mode: "anticipation" | "reveal";
};

export default function ReflectionModal({ isOpen, onClose, reflection, mode }: ReflectionModalProps) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            return () => document.removeEventListener("keydown", handleEsc);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Anticipation mode - shown after saving
    if (mode === "anticipation") {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isClosing ? 0 : 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: isClosing ? 0.9 : 1, opacity: isClosing ? 0 : 1, y: isClosing ? 20 : 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950 via-neutral-900 to-black p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative glow */}
                        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />

                        <div className="relative text-center">
                            {/* Moon icon */}
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 text-4xl">
                                🌙
                            </div>

                            <h2 className="text-xl font-semibold text-white">
                                Entry saved!
                            </h2>

                            <p className="mt-2 text-sm text-neutral-400">
                                Your reflection is being prepared...
                            </p>

                            {/* Tomorrow teaser */}
                            <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-4">
                                <p className="text-xs uppercase tracking-widest text-indigo-300">
                                    Tomorrow at 8pm
                                </p>
                                <p className="mt-2 text-sm text-neutral-200">
                                    A personal insight about today's entry will be waiting for you...
                                </p>
                                <p className="mt-3 text-lg">
                                    ✨
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20"
                            >
                                Got it, see you tomorrow
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    // Reveal mode - shown when they return
    if (mode === "reveal" && reflection) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isClosing ? 0 : 1 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: isClosing ? 0.9 : 1, opacity: isClosing ? 0 : 1, y: isClosing ? 20 : 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-950/50 via-neutral-900 to-black p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Decorative glow */}
                        <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />

                        <div className="relative">
                            {/* Sun icon */}
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-4xl">
                                🌅
                            </div>

                            <p className="text-center text-xs uppercase tracking-widest text-amber-300">
                                Reflection from {reflection.date}
                            </p>

                            {/* The insight */}
                            <div className="mt-4 rounded-2xl bg-white/5 p-4">
                                <p className="text-sm leading-relaxed text-neutral-200">
                                    "{reflection.insight}"
                                </p>
                            </div>

                            {/* Today's prompt */}
                            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-950/30 p-4">
                                <p className="text-xs uppercase tracking-widest text-amber-400">
                                    💭 Today's thought
                                </p>
                                <p className="mt-2 text-sm text-neutral-200">
                                    {reflection.question}
                                </p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="mt-6 w-full rounded-xl bg-amber-600/80 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600"
                            >
                                Start writing today
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return null;
}
