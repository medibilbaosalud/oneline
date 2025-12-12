// src/app/coach/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useVault } from "@/hooks/useVault";
import { decryptText } from "@/lib/crypto";
import VaultGate from "@/components/VaultGate";
import CoachOnboarding from "@/components/CoachOnboarding";
import { useVisitor } from "@/components/VisitorMode";

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
    const { isVisitor, showSignupPrompt } = useVisitor();
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
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [shouldStartNewChat, setShouldStartNewChat] = useState(false);

    const [savedChats, setSavedChats] = useState<{ id: string; updated_at: string; messageCount: number; preview: string }[]>([]);
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

    // Load previous chat history from server
    const loadChatHistory = useCallback(async () => {
        try {
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch("/api/coach/history", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    // Convert saved messages to our Message type
                    const loadedMessages: Message[] = data.messages.map((m: { id: string; role: string; content: string; timestamp: string }) => ({
                        id: m.id,
                        role: m.role as "user" | "assistant",
                        content: m.content,
                        timestamp: new Date(m.timestamp),
                    }));

                    // Add a separator message to show history was loaded
                    const separator: Message = {
                        id: "history-separator",
                        role: "assistant",
                        content: "📚 *Previous conversation loaded*\n\nI remember our past chats! Feel free to continue where we left off, or start a new topic.",
                        timestamp: new Date(),
                    };

                    setMessages([...loadedMessages, separator]);
                    setAccessToast("💬 Previous conversation loaded");
                    setTimeout(() => setAccessToast(null), 3000);
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error("[Coach] Failed to load chat history:", e);
            return false;
        }
    }, []);

    useEffect(() => {
        async function init() {
            // Visitor mode initialization
            if (isVisitor) {
                setHasConsent(true); // Mock consent for demo UI
                setShareEntries(false);
                setMessages([{
                    id: 'welcome-visitor',
                    role: 'assistant',
                    content: "Hi! I'm your AI Journal Coach. I can help you reflect on your day, find patterns in your mood, or just chat.\n\nSince this is a demo, I can't read your journal entries yet. Sign up to unlock my full potential!",
                    timestamp: new Date()
                }]);
                setInitializing(false);
                return;
            }

            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const savedConsent = localStorage.getItem("coach_consent");
                const savedShareEntries = localStorage.getItem("coach_share_entries");

                // If user previously granted FULL ACCESS, don't ask again
                if (savedConsent === "true" && savedShareEntries === "true") {
                    setHasConsent(true);
                    setShareEntries(true);

                    // Try to load previous chat history
                    const hadHistory = await loadChatHistory();
                    if (!hadHistory) {
                        showWelcome();
                    }

                    // Show reminder toast that we have access
                    setAccessToast("📖 Full Access enabled - I can see your journal history");
                    setTimeout(() => setAccessToast(null), 4000);
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
    }, [loadChatHistory, isVisitor]);

    function showWelcome() {
        // Clear ALL messages and show fresh welcome
        setMessages([{
            id: "welcome",
            role: "assistant",
            content: `Hi! I'm your OneLine AI Coach. 🌟

I can see your journaling patterns and mood data to help you reflect. Ask me anything about your journey!

*Note: I'm an AI and may make mistakes. I'm here to help you reflect, not to replace professional support.*`,
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
    // Finish current chat - call API to summarize and save to user profile
    async function handleFinishChat() {
        const messageCount = messages.filter(m => m.id !== "welcome" && m.id !== "history-separator").length;

        if (messageCount === 0) {
            setAccessToast("✨ Starting new conversation");
            setTimeout(() => setAccessToast(null), 2000);
            showWelcome();
            setShouldStartNewChat(true);
            return;
        }

        setAccessToast("💭 Saving insights...");

        try {
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setAccessToast("⚠️ Session expired");
                setTimeout(() => setAccessToast(null), 2000);
                return;
            }

            // Call finish API to summarize and store insights
            const res = await fetch("/api/coach/finish", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                console.log("[Coach] Chat finished, summary saved:", data);
                setAccessToast(`✅ Insights saved! (${data.totalChats} total chats)`);
            } else {
                setAccessToast("✅ Chat finished");
            }
        } catch (e) {
            console.error("[Coach] Failed to finish chat:", e);
            setAccessToast("✅ Chat finished");
        } finally {
            setTimeout(() => setAccessToast(null), 3000);
            showWelcome();
            setShouldStartNewChat(true);
        }
    }

    // Load list of all saved chats
    async function loadChatsList() {
        try {
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch("/api/coach/chats", {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                const data = await res.json();
                setSavedChats(data.chats || []);
                setShowHistoryModal(true);
            }
        } catch (e) {
            console.error("[Coach] Failed to load chats list:", e);
        }
    }

    // Load a specific chat by ID
    async function loadSpecificChat(chatId: string) {
        try {
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch(`/api/coach/chats/${chatId}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (res.ok) {
                const data = await res.json();
                const loadedMessages: Message[] = (data.messages || []).map((m: { id: string; role: string; content: string; timestamp: string }) => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    timestamp: new Date(m.timestamp),
                }));

                setMessages(loadedMessages);
                setShowHistoryModal(false);
                setAccessToast("📚 Previous chat loaded");
                setTimeout(() => setAccessToast(null), 2000);
            }
        } catch (e) {
            console.error("[Coach] Failed to load specific chat:", e);
        }
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

        // In visitor mode, prompt signup instead of chatting
        if (isVisitor) {
            showSignupPrompt();
            return;
        }

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
                    entries: entriesToSend,
                    forceNewChat: shouldStartNewChat,
                }),
            });

            // Handle errors (usually JSON)
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json") || !response.ok) {
                if (!response.body) throw new Error("No response");
                // If it's JSON error or we can't stream
                if (contentType?.includes("application/json")) {
                    const data = await response.json();
                    if (data.limitReached) {
                        setError(`Daily limit reached (${data.limit} messages)`);
                        return;
                    }
                    throw new Error(data.error || "Failed to get response");
                }
                if (!response.ok) throw new Error("Network response was not ok");
            }

            // Read usage headers
            const usageHeader = response.headers.get("X-Coach-Usage");
            const limitHeader = response.headers.get("X-Coach-Limit");
            if (usageHeader && limitHeader) {
                setUsage({ used: parseInt(usageHeader), limit: parseInt(limitHeader) });
            }

            if (shouldStartNewChat) {
                setShouldStartNewChat(false);
            }

            // Create placeholder assistant message
            const assistantMessageId = (Date.now() + 1).toString();
            const assistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: "",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);

            // Stream reader
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No stream reader available");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === assistantMessageId
                            ? { ...msg, content: msg.content + chunk }
                            : msg
                    )
                );
            }

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Something went wrong");
            // Remove the empty assistant message if it failed immediately? 
            // Better to leave it or mark as error, but for now simple error toast is fine.
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

                            {/* Ethical Disclaimer */}
                            <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 p-4 mb-4">
                                <p className="text-xs text-amber-200/80 text-center">
                                    ⚠️ <strong>This is an AI, not a professional.</strong>
                                    <br />
                                    The Coach does <strong>not</strong> replace doctors, psychologists, or therapists.
                                    <br />
                                    If you're in crisis, please seek professional help.
                                </p>
                            </div>

                            {/* Privacy Note */}
                            <div className="rounded-xl bg-neutral-800/50 p-4 text-center">
                                <p className="text-xs text-neutral-500">
                                    You can change settings anytime from the header.
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

            {/* Chat History Modal */}
            <AnimatePresence>
                {showHistoryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                        onClick={() => setShowHistoryModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-lg max-h-[70vh] rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-2xl border border-white/10 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">📚 Chat History</h2>
                                    <button
                                        onClick={() => setShowHistoryModal(false)}
                                        className="text-neutral-400 hover:text-white text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                <p className="text-sm text-neutral-400 mt-1">Select a conversation to continue</p>
                            </div>

                            {/* Chat List */}
                            <div className="p-4 overflow-y-auto max-h-[50vh]">
                                {savedChats.length === 0 ? (
                                    <div className="text-center py-8 text-neutral-500">
                                        <p className="text-4xl mb-2">💬</p>
                                        <p>No saved conversations yet</p>
                                        <p className="text-sm">Your chats will appear here after you finish them</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {savedChats.map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => loadSpecificChat(chat.id)}
                                                className="w-full text-left p-4 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 transition border border-white/5 hover:border-white/10"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate">{chat.preview}</p>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                                                            <span>💬 {chat.messageCount} messages</span>
                                                            <span>📅 {new Date(chat.updated_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-neutral-500 text-lg">→</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        setShowHistoryModal(false);
                                        showWelcome();
                                    }}
                                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition"
                                >
                                    ➕ Start New Chat
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="border-b border-white/10 bg-gradient-to-r from-neutral-950 via-neutral-900/95 to-neutral-950 px-4 py-4 backdrop-blur-sm">
                <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 blur opacity-60" />
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl shadow-lg">
                                🧠
                            </div>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">AI Coach</h1>
                            <p className="text-xs text-neutral-400">Your journaling companion</p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowConsentModal(true)}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${shareEntries
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border border-white/10 bg-white/5 text-neutral-400"
                                }`}
                            title="Change access level"
                        >
                            {shareEntries ? "📖" : "🔒"}
                            <span className="hidden sm:inline">
                                {shareEntries ? "Full Access" : "Limited"}
                            </span>
                        </button>

                        <button
                            onClick={handleFinishChat}
                            className="flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-300 transition hover:bg-orange-500/20"
                            title="Finish chat and start fresh"
                        >
                            ✨
                            <span className="hidden sm:inline">New Chat</span>
                        </button>

                        <button
                            onClick={loadChatsList}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-300 transition hover:bg-white/10"
                            title="View chat history"
                        >
                            📚
                        </button>

                        {/* Usage indicator */}
                        <div className="ml-1 flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-3 py-1.5">
                            <span className={`text-sm font-bold ${usage.used >= usage.limit ? "text-rose-400" : "text-white"}`}>
                                {usage.used}
                            </span>
                            <span className="text-[10px] text-neutral-500">/{usage.limit} today</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 pb-48 bg-neutral-950 scrollbar-hide">
                <div className="mx-auto max-w-2xl space-y-6">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 mt-1">
                                    {message.role === "assistant" ? (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                                            🧠
                                        </div>
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-800 text-sm ring-1 ring-white/5">
                                            👤
                                        </div>
                                    )}
                                </div>

                                {/* Message bubble */}
                                <div
                                    className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm ${message.role === "user"
                                        ? "bg-indigo-600 text-white shadow-indigo-500/10 rounded-tr-none"
                                        : "border border-white/5 bg-[#1F2430] text-neutral-100 rounded-tl-none"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                                        {message.content}
                                    </p>
                                    <p className={`mt-1.5 text-[10px] font-medium ${message.role === "user" ? "text-indigo-200/60" : "text-neutral-500"}`}>
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                                🧠
                            </div>
                            <div className="rounded-2xl rounded-tl-none border border-white/5 bg-[#1F2430] px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <motion.span
                                        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                                        className="h-2 w-2 rounded-full bg-indigo-400"
                                    />
                                    <motion.span
                                        animate={{ scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: 0.2, ease: "easeInOut" }}
                                        className="h-2 w-2 rounded-full bg-purple-400"
                                    />
                                    <motion.span
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                                        className="h-2 w-2 rounded-full bg-fuchsia-400"
                                    />
                                    <span className="ml-2 text-xs text-neutral-500">Thinking...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <div className="mx-auto max-w-md rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-sm text-rose-300">
                            ⚠️ {error}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Suggested prompts */}
            {messages.length <= 1 && hasConsent && (
                <div className="border-t border-white/10 bg-gradient-to-t from-neutral-900 via-neutral-900/95 to-transparent px-4 py-4">
                    <p className="mb-3 text-center text-xs text-neutral-500">Try one of these:</p>
                    <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
                        {SUGGESTED_PROMPTS.map((prompt) => (
                            <button
                                key={prompt.text}
                                onClick={() => handlePromptClick(prompt.text)}
                                className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20 hover:border-indigo-500/30"
                            >
                                {prompt.emoji} {prompt.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#0c0e15]/80 backdrop-blur-2xl p-4 pb-6">
                <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
                    <div className="flex gap-4 items-end">
                        {/* Microphone Button */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={loading}
                            className={`flex-shrink-0 rounded-2xl p-3.5 transition-all ${isRecording
                                ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30"
                                : "border border-white/5 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
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
                        </motion.button>

                        <div className="relative flex-1 group/input">
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
                                placeholder="Reflect on your day..."
                                rows={1}
                                disabled={!hasConsent || usage.used >= usage.limit}
                                className="w-full resize-none rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 pr-4 text-[15px] text-white placeholder-neutral-500 focus:bg-white/10 focus:outline-none transition-colors disabled:opacity-50 scrollbar-hide"
                                style={{ minHeight: "52px", maxHeight: "120px" }}
                            />
                            {/* Glow effect on focus */}
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent group-focus-within/input:ring-indigo-500/30 transition-all pointer-events-none" />
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={!input.trim() || loading || !hasConsent}
                            className={`flex-shrink-0 rounded-2xl p-3.5 text-white shadow-lg transition-all ${!input.trim() || loading || !hasConsent
                                ? 'bg-white/5 text-neutral-600 shadow-none'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/30 hover:shadow-indigo-500/50'
                                }`}
                        >
                            <svg className="h-5 w-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </motion.button>
                    </div>
                </form>
            </div>
            <CoachOnboarding onComplete={() => { }} />
        </div>
    );
}
