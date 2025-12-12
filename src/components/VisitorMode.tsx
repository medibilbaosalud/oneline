"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { supabaseBrowser, isSupabaseConfigured } from "@/lib/supabaseBrowser";

const VISITOR_MODE_KEY = "oneline:visitor-mode";

type VisitorContextType = {
    isVisitor: boolean;
    isAuthenticated: boolean;
    enterVisitorMode: () => void;
    exitVisitorMode: () => void;
    showSignupPrompt: () => void;
};

const VisitorContext = createContext<VisitorContextType | null>(null);

export function useVisitor() {
    const context = useContext(VisitorContext);
    if (!context) {
        throw new Error("useVisitor must be used within VisitorProvider");
    }
    return context;
}

type VisitorProviderProps = {
    children: ReactNode;
};

export function VisitorProvider({ children }: VisitorProviderProps) {
    const [isVisitor, setIsVisitor] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    // Check auth status on mount
    useEffect(() => {
        async function checkAuth() {
            if (!isSupabaseConfigured()) {
                setHasChecked(true);
                return;
            }

            try {
                const supabase = supabaseBrowser();
                const { data: { session } } = await supabase.auth.getSession();
                setIsAuthenticated(!!session?.user);

                // If authenticated, exit visitor mode
                if (session?.user) {
                    setIsVisitor(false);
                    if (typeof window !== "undefined") {
                        localStorage.removeItem(VISITOR_MODE_KEY);
                    }
                } else {
                    // Check if was in visitor mode
                    const wasVisitor = typeof window !== "undefined" && localStorage.getItem(VISITOR_MODE_KEY) === "true";
                    setIsVisitor(wasVisitor);
                }
            } catch {
                // Ignore errors
            } finally {
                setHasChecked(true);
            }
        }

        checkAuth();
    }, []);

    const enterVisitorMode = useCallback(() => {
        setIsVisitor(true);
        if (typeof window !== "undefined") {
            localStorage.setItem(VISITOR_MODE_KEY, "true");
        }
    }, []);

    const exitVisitorMode = useCallback(() => {
        setIsVisitor(false);
        if (typeof window !== "undefined") {
            localStorage.removeItem(VISITOR_MODE_KEY);
        }
    }, []);

    const showSignupPrompt = useCallback(() => {
        setShowPrompt(true);
    }, []);

    if (!hasChecked) {
        return null;
    }

    return (
        <VisitorContext.Provider
            value={{
                isVisitor,
                isAuthenticated,
                enterVisitorMode,
                exitVisitorMode,
                showSignupPrompt,
            }}
        >
            {children}

            {/* Visitor Banner */}
            <AnimatePresence>
                {isVisitor && !isAuthenticated && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-0 inset-x-0 z-40 border-t border-amber-500/30 bg-gradient-to-r from-amber-900/95 via-amber-800/95 to-amber-900/95 backdrop-blur-sm"
                    >
                        <div className="mx-auto max-w-4xl px-4 py-3">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">👀</span>
                                    <div className="text-sm">
                                        <p className="font-medium text-amber-100">Visitor Mode</p>
                                        <p className="text-amber-200/70">You're exploring. Sign up to save entries.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href="/auth"
                                        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                                    >
                                        Create Account
                                    </Link>
                                    <Link
                                        href="/auth"
                                        className="rounded-lg border border-amber-400/30 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
                                    >
                                        Sign In
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Signup Prompt Modal */}
            <AnimatePresence>
                {showPrompt && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                            onClick={() => setShowPrompt(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 sm:inset-x-auto"
                        >
                            <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
                                <div className="text-center">
                                    <span className="text-5xl">🔐</span>
                                    <h3 className="mt-4 text-xl font-bold text-white">Sign up to save</h3>
                                    <p className="mt-2 text-neutral-400">
                                        Create a free account to save your entries, track streaks, and generate AI stories.
                                    </p>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <Link
                                        href="/auth"
                                        className="block w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 text-center font-semibold text-white shadow-lg transition hover:shadow-indigo-500/25"
                                        onClick={() => setShowPrompt(false)}
                                    >
                                        Create Free Account
                                    </Link>
                                    <button
                                        onClick={() => setShowPrompt(false)}
                                        className="block w-full rounded-xl border border-white/10 py-3 text-center font-medium text-neutral-300 transition hover:bg-white/5"
                                    >
                                        Continue Exploring
                                    </button>
                                </div>

                                <p className="mt-4 text-center text-xs text-neutral-500">
                                    No credit card required. End-to-end encrypted.
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </VisitorContext.Provider>
    );
}

// Component to gate features that require authentication
type VisitorGateProps = {
    children: ReactNode;
    fallback?: ReactNode;
    action?: string; // What action requires auth (for messaging)
};

export function VisitorGate({ children, fallback, action = "this feature" }: VisitorGateProps) {
    const { isVisitor, isAuthenticated, showSignupPrompt } = useVisitor();

    if (isAuthenticated) {
        return <>{children}</>;
    }

    if (isVisitor) {
        return (
            <>
                {fallback || (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                        <span className="text-3xl">🔒</span>
                        <h3 className="mt-3 font-semibold text-amber-200">Sign up to access {action}</h3>
                        <p className="mt-1 text-sm text-amber-100/70">
                            Create a free account to unlock all features.
                        </p>
                        <button
                            onClick={showSignupPrompt}
                            className="mt-4 rounded-lg bg-amber-500 px-6 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-400"
                        >
                            Sign Up Free
                        </button>
                    </div>
                )}
            </>
        );
    }

    return <>{children}</>;
}
