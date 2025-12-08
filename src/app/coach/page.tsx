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
    { emoji: "🔍", text: "What patterns do you see in my entries?" },
    { emoji: "💭", text: "How have I been feeling this week?" },
    { emoji: "🌟", text: "What's something positive from my recent writing?" },
    { emoji: "🎯", text: "What should I focus on based on my journal?" },
];

export default function CoachPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Check auth and show welcome message
        async function init() {
            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setMessages([{
                    id: "welcome",
                    role: "assistant",
                    content: "Hi! I'm your OneLine Coach. 🌟\n\nI've read through your journal entries and I'm here to help you reflect on your journey. Ask me anything about patterns, emotions, or insights from your writing.",
                    timestamp: new Date(),
                }]);
            } else {
                setError("Please sign in to use the AI Coach");
            }
            setInitializing(false);
        }
        init();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    async function handleSubmit(e?: React.FormEvent) {
        e?.preventDefault();
        if (!input.trim() || loading) return;

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
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

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
            {/* Header */}
            <header className="border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur-sm">
                <div className="mx-auto flex max-w-2xl items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl">
                        🧠
                    </div>
                    <div>
                        <h1 className="font-semibold text-white">AI Coach</h1>
                        <p className="text-xs text-neutral-400">Your personal journaling companion</p>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
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
            {messages.length <= 1 && (
                <div className="border-t border-white/10 bg-neutral-950/50 px-4 py-3">
                    <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
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
            <div className="border-t border-white/10 bg-neutral-950 p-4">
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
                            className="flex-1 resize-none rounded-xl border border-white/10 bg-neutral-800 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
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
