// src/components/InstallPrompt.tsx
"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true);
            return;
        }

        // Check if user dismissed the prompt before
        const wasDismissed = localStorage.getItem("oneline_install_dismissed");
        if (wasDismissed) {
            setDismissed(true);
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        // Listen for successful install
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        } catch (error) {
            console.error("[InstallPrompt] Error:", error);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem("oneline_install_dismissed", "true");
    };

    // Don't show if already installed, dismissed, or no prompt available
    if (isInstalled || dismissed || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-fade-in">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/95 via-neutral-900/95 to-black/95 p-4 shadow-2xl shadow-indigo-500/20 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-2xl">
                        📱
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-white">Install OneLine</h3>
                        <p className="mt-1 text-sm text-neutral-400">
                            Add to your home screen for quick access and offline support.
                        </p>
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={handleInstall}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
                            >
                                Install App
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-white/10"
                            >
                                Not now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
