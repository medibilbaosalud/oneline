// src/components/NotificationPrompt.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type NotificationPromptProps = {
    onClose?: () => void;
};

// Helper to convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function NotificationPrompt({ onClose }: NotificationPromptProps) {
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [loading, setLoading] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermission(Notification.permission);
        }
        const wasDismissed = localStorage.getItem("notification_prompt_dismissed");
        if (wasDismissed) setDismissed(true);
        checkSubscription();
    }, []);

    async function checkSubscription() {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            if (sub) setSubscribed(true);
        } catch {
            // Ignore
        }
    }

    async function handleEnable() {
        setLoading(true);
        setError(null);

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== "granted") {
                setError("Permission denied. Enable in browser settings.");
                setLoading(false);
                return;
            }

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                setError("Push notifications not configured.");
                setLoading(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const keyArray = urlBase64ToUint8Array(vapidKey);

            // Subscribe to push manager
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                // Type assertion needed for TypeScript compatibility
                applicationServerKey: keyArray as unknown as BufferSource,
            });

            // Get auth session
            const supabase = supabaseBrowser();
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                setError("Please sign in first.");
                setLoading(false);
                return;
            }

            // Send subscription to server
            const response = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(pushSubscription.toJSON()),
            });

            if (!response.ok) {
                throw new Error("Failed to save subscription");
            }

            setSubscribed(true);
        } catch (err) {
            console.error("Push subscription error:", err);
            setError("Failed to enable notifications.");
        } finally {
            setLoading(false);
        }
    }

    function handleDismiss() {
        localStorage.setItem("notification_prompt_dismissed", "true");
        setDismissed(true);
        onClose?.();
    }

    // Don't render if not supported, subscribed, or dismissed
    if (typeof window === "undefined" || !("Notification" in window) || subscribed || dismissed || permission === "denied") {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md"
            >
                <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/95 to-neutral-900/95 p-4 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-2xl">
                            🔔
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-white">Daily Reminder</h3>
                            <p className="mt-1 text-sm text-neutral-300">
                                Get a gentle nudge at 8pm to capture your day&apos;s thoughts.
                            </p>
                            {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={handleEnable}
                                    disabled={loading}
                                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    {loading ? "Enabling..." : "Enable"}
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="rounded-lg px-4 py-2 text-sm text-neutral-400 transition hover:text-white"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
