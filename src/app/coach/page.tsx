// src/app/coach/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import VaultGate from "@/components/VaultGate";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
};

const SUGGESTED_PROMPTS = [
    { emoji: "🔍", text: "¿Qué patrones ves en mi escritura?" },
    { emoji: "💭", text: "¿Cómo me he sentido últimamente?" },
    { emoji: "🌟", text: "¿Qué fortalezas ves en mí?" },
    { emoji: "🎯", text: "¿En qué debería enfocarme?" },
    { emoji: "💡", text: "Dame un pequeño desafío para hoy" },
];

const DAILY_LIMIT = 300;

export default function CoachPage() {
    const { dataKey } = useVault(); // For decrypting entries
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasConsent, setHasConsent] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [usage, setUsage] = useState({ used: 0, limit: DAILY_LIMIT });
    const [shareEntries, setShareEntries] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [accessToast, setAccessToast] = useState<string | null>(null);
    const [decryptedEntries, setDecryptedEntries] = useState<{ content: string; day: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch and decrypt journal entries (same pattern as StoryGenerator)
    const loadDecryptedEntries = useCallback(async () => {
        if (!dataKey) {
            console.log("[Coach] No dataKey, cannot decrypt entries");
            return [];
        }

        try {
            const res = await fetch("/api/history?limit=30", { cache: "no-store" });
            if (!res.ok) {
                console.log("[Coach] Failed to fetch history:", res.status);
                return [];
            }

            const json = await res.json();
            const entries = json.entries || [];
            console.log("[Coach] Fetched entries:", entries.length);

            const decrypted: { content: string; day: string }[] = [];
            for (const entry of entries) {
                if (entry.content_cipher && entry.iv) {
                    try {
                        const text = await decryptText(dataKey, entry.content_cipher, entry.iv);
                        if (text.trim()) {
                            decrypted.push({ content: text, day: entry.day || entry.created_at?.slice(0, 10) });
                        }
                    } catch (e) {
                        console.log("[Coach] Failed to decrypt entry:", entry.day, e);
                    }
                } else if (entry.content && entry.content.trim()) {
                    // Unencrypted legacy entry
                    decrypted.push({ content: entry.content, day: entry.day || entry.created_at?.slice(0, 10) });
                }
            }

            console.log("[Coach] Decrypted entries:", decrypted.length);
            return decrypted;
        } catch (e) {
            console.error("[Coach] Error loading entries:", e);
            return [];
        }
    }, [dataKey]);

    useEffect(() => {
        async function init() {
            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const savedConsent = localStorage.getItem("coach_consent");
                const savedShareEntries = localStorage.getItem("coach_share_entries");

                // If user previously granted FULL ACCESS, don't ask again
                if (savedConsent === "true" && savedShareEntries === "true") {
                    setHasConsent(true);
                    setShareEntries(true);
                    showWelcome();

                    // Show reminder toast that we have access
                    setAccessToast("📖 Full Access enabled - I can see your journal history");
                    setTimeout(() => setAccessToast(null), 4000); // Hide after 4 seconds
                } else {
                    // If NO consent or only METADATA logic, ask again (as requested)
                    setShowConsentModal(true);

                    // But if they are physically in metadata mode from before, strict defaults
                    setHasConsent(false);
                    setShareEntries(false);
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

    function toggleShareEntries() {
        const newValue = !shareEntries;
        setShareEntries(newValue);
        localStorage.setItem("coach_share_entries", String(newValue));
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Voice recording
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                await transcribeAudio(blob);
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone");
        }
    }

    function stopRecording() {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setMediaRecorder(null);
            setIsRecording(false);
        }
    }

    async function transcribeAudio(blob: Blob) {
        setLoading(true);
        try {
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) throw new Error("Please sign in");

            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");

            const response = await fetch("/api/transcribe", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Transcription failed");

            if (data.text) {
                setInput((prev) => prev + (prev ? " " : "") + data.text);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Transcription failed");
        } finally {
            setLoading(false);
        }
    }

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

            // If user wants to share entries, decrypt them client-side first
            let entriesToSend: { content: string; day: string }[] = [];
            if (shareEntries && dataKey) {
                entriesToSend = await loadDecryptedEntries();
                console.log("[Coach] Sending", entriesToSend.length, "decrypted entries to API");
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
                    shareEntries: shareEntries,
                    entries: entriesToSend, // <-- NEW: Send decrypted entries from client
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
            {/* Access Toast - shows briefly when entering with Full Access */}
            <AnimatePresence>
                {accessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
                    >
                        {accessToast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Consent Modal - Initial access configuration */}
            <AnimatePresence>
                {showConsentModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 p-8 shadow-2xl border border-white/10"
                        >
                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl shadow-lg shadow-indigo-500/30">
                                    🧠
                                </div>
                                <h2 className="text-2xl font-bold text-white">Your Personal Coach</h2>
                                <p className="mt-2 text-neutral-400">How should I help you today?</p>
                            </div>

                            {/* Main Question */}
                            <div className="mb-6 text-center">
                                <p className="text-lg text-white font-medium mb-2">
                                    Should I read your journal entries?
                                </p>
                                <p className="text-sm text-neutral-400">
                                    Reading them allows me to give deeper, personalized insights.
                                </p>
                            </div>

                            {/* Access Options */}
                            <div className="space-y-3 mb-6">
                                {/* Full Access Option */}
                                <button
                                    onClick={() => {
                                        localStorage.setItem("coach_consent", "true");
                                        localStorage.setItem("coach_share_entries", "true");
                                        setHasConsent(true);
                                        setShareEntries(true);
                                        setShowConsentModal(false);
                                        showWelcome();
                                    }}
                                    className="w-full rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 p-5 text-left transition hover:bg-emerald-500/20 hover:border-emerald-500"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
                                            📖
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-emerald-400 text-lg">Read My Entries</h3>
                                            <p className="text-sm text-neutral-300 mt-1">
                                                I can analyze your writing to find patterns and offer deep reflections.
                                                <span className="block text-xs opacity-70 mt-1">(Note: I cannot read encrypted end-to-end entries yet)</span>
                                            </p>
                                            <p className="text-xs text-emerald-400/70 mt-2">✨ Recommended for best insights</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Limited Access Option */}
                                <button
                                    onClick={() => {
                                        // User chose NO/Limited. DON'T save persistence so we ask again next time.
                                        localStorage.removeItem("coach_consent");
                                        localStorage.removeItem("coach_share_entries");

                                        // Set temporary session state
                                        setHasConsent(true);
                                        setShareEntries(false);
                                        setShowConsentModal(false);
                                        showWelcome();
                                    }}
                                    className="w-full rounded-2xl border-2 border-white/10 bg-neutral-800/50 p-5 text-left transition hover:bg-neutral-800 hover:border-white/20"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neutral-700 text-2xl">
                                            🔒
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white text-lg">Metadata Only</h3>
                                            <p className="text-sm text-neutral-400 mt-1">
                                                I only see your mood scores, streaks, and habits. Your writing stays private.
                                            </p>
                                            <p className="text-xs text-neutral-500 mt-2">🔐 Maximum privacy</p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Privacy Note */}
                            <div className="rounded-xl bg-neutral-800/50 p-4 text-center">
                                <p className="text-xs text-neutral-500">
                                    You can change this setting anytime from the header.
                                    <br />Data processed via <span className="text-neutral-400">Groq AI</span> per our{" "}
                                    <a href="/legal/privacy" className="text-indigo-400 underline">Privacy Policy</a>.
                                </p>
                            </div>

                            {/* Decline */}
                            <button
                                onClick={handleConsentDecline}
                                className="mt-4 w-full text-center text-sm text-neutral-500 hover:text-neutral-300 transition"
                            >
                                I don't want to use Coach
                            </button>
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

                    {/* Access Level Indicator - click to change */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowConsentModal(true)}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${shareEntries
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-neutral-800 text-neutral-400"
                                }`}
                            title="Change access level"
                        >
                            {shareEntries ? "📅" : "🔒"}
                            <span className="hidden sm:inline">
                                {shareEntries ? "With History" : "Metadata Only"}
                            </span>
                        </button>

                        {/* Usage indicator */}
                        <div className="text-right text-xs text-neutral-400">
                            <span className={usage.used >= usage.limit ? "text-rose-400" : ""}>
                                {usage.used}/{usage.limit}
                            </span>
                            <span className="block text-[10px]">hoy</span>
                        </div>
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
                        {/* Microphone Button */}
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={loading}
                            className={`rounded-xl px-3 py-3 transition ${isRecording
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                                } disabled:opacity-50`}
                            title={isRecording ? "Stop recording" : "Voice input"}
                        >
                            {isRecording ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="6" y="6" width="12" height="12" rx="2" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            )}
                        </button>

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
