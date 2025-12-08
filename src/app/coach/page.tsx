// src/app/coach/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
};

const SUGGESTED_PROMPTS = [
    { emoji: "🔍", text: "What patterns do you see in my journaling?" },
    { emoji: "💭", text: "How have I been feeling lately?" },
    { emoji: "🌟", text: "What are my strengths based on my entries?" },
    { emoji: "🎯", text: "What should I focus on next?" },
];

const DAILY_LIMIT = 20;

export default function CoachPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasConsent, setHasConsent] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [usage, setUsage] = useState({ used: 0, limit: DAILY_LIMIT });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        async function init() {
            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Check if consent was given before
                const savedConsent = localStorage.getItem("coach_consent");
                if (savedConsent === "true") {
                    setHasConsent(true);
                    showWelcome();
                } else {
                    setShowConsentModal(true);
                }
            } else {
                setError("Please sign in to use the AI Coach");
            }
            setInitializing(false);
        }
        init();
    }, []);

    function showWelcome() {
        setMessages([{
            id: "welcome",
            role: "assistant",
            content: "Hi! I'm your OneLine Coach. 🌟\n\nI can see your journaling patterns and mood data to help you reflect. Ask me anything about your journey!",
            timestamp: new Date(),
        }]);
    }

    function handleConsentAccept() {
        localStorage.setItem("coach_consent", "true");
        setHasConsent(true);
        setShowConsentModal(false);
        showWelcome();
    }

    function handleConsentDecline() {
        setShowConsentModal(false);
        setError("Coach needs access to your data to provide insights");
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        if (!input.trim() || loading || !hasConsent) return;

        if (usage.used >= usage.limit) {
            setError(`Daily limit reached (${usage.limit} messages). Try again tomorrow!`);
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);
        setError(null);

        try {
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error("Please sign in");
            }

            const response = await fetch("/api/coach/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                    hasConsent: true,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.limitReached) {
                    setError(`Daily limit reached (${data.limit} messages)`);
                    return;
                }
                throw new Error(data.error || "Failed to get response");
            }

            // Update usage
            if (data.usage) {
                setUsage(data.usage);
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    function handlePromptClick(prompt: string) {
        setInput(prompt);
        inputRef.current?.focus();
    }

    if (initializing) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent"
                />
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col pt-12">
            {/* Consent Modal */}
            <AnimatePresence>
                {showConsentModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md rounded-2xl bg-neutral-900 p-6 shadow-xl"
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-2xl">
                                    🔒
                                </div>
                                <h2 className="text-lg font-semibold text-white">Privacy Notice</h2>
                            </div>

                            <p className="mb-4 text-sm text-neutral-300">
                                To provide personalized insights, the AI Coach needs access to:
                            </p>

                            <ul className="mb-6 space-y-2 text-sm text-neutral-400">
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400">✓</span> Your mood tracking data
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-emerald-400">✓</span> Your journaling patterns and streaks
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400">⚡</span> Entry metadata (not encrypted content)
                                </li>
                            </ul>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleConsentDecline}
                                    className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-neutral-400 transition hover:bg-neutral-800"
                                >
                                    Decline
                                </button>
                                <button
                                    onClick={handleConsentAccept}
                                    className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                                >
                                    Allow Access
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl">
                            🧠
                        </div>
                        <div>
                            <h1 className="font-semibold text-white">AI Coach</h1>
                            <p className="text-xs text-neutral-400">Your personal companion</p>
                        </div>
                    </div>
                    {/* Usage indicator */}
                    <div className="text-right text-xs text-neutral-400">
                        <span className={usage.used >= usage.limit ? "text-rose-400" : ""}>
                            {usage.used}/{usage.limit}
                        </span>
                        <span className="block text-[10px]">today</span>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">
                <div className="mx-auto max-w-2xl space-y-4">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.role === "user"
                                            ? "bg-indigo-600 text-white"
                                            : "bg-neutral-800/80 text-neutral-100"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {message.content}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="rounded-2xl bg-neutral-800/80 px-4 py-3">
                                <div className="flex gap-1">
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "0ms" }} />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "150ms" }} />
                                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <div className="text-center text-sm text-rose-400">{error}</div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Suggested prompts */}
            {messages.length <= 1 && hasConsent && (
                <div className="border-t border-white/10 bg-neutral-950/50 px-4 py-3">
                    <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
                        {SUGGESTED_PROMPTS.map((prompt) => (
                            <button
                                key={prompt.text}
                                onClick={() => handlePromptClick(prompt.text)}
                                className="rounded-full border border-white/10 bg-neutral-800/50 px-3 py-1.5 text-xs text-neutral-300 transition hover:bg-neutral-700"
                            >
                                {prompt.emoji} {prompt.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-neutral-950 p-4 pb-6">
                <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
                    <div className="flex gap-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder="Ask me anything about your journal..."
                            rows={1}
                            disabled={!hasConsent || usage.used >= usage.limit}
                            className="flex-1 resize-none rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading || !hasConsent}
                            className="rounded-xl bg-indigo-600 px-4 py-3 text-white transition hover:bg-indigo-500 disabled:opacity-50"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
