// src/components/NotificationSettings.tsx
"use client";

import { useState, useEffect } from "react";

type NotificationPrefs = {
    daily_reminder_enabled: boolean;
    use_smart_learning: boolean;
    weekday_hour: number;
    weekday_minute: number;
    weekend_hour: number;
    weekend_minute: number;
    timezone: string;
    streak_risk_enabled: boolean;
};

type NotificationSettingsProps = {
    accessToken: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number): string {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? "AM" : "PM";
    return `${h}:00 ${ampm}`;
}

export default function NotificationSettings({ accessToken }: NotificationSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [pushEnabled, setPushEnabled] = useState(false);

    const [prefs, setPrefs] = useState<NotificationPrefs>({
        daily_reminder_enabled: true,
        use_smart_learning: true,
        weekday_hour: 20,
        weekday_minute: 0,
        weekend_hour: 11,
        weekend_minute: 0,
        timezone: "Europe/Madrid",
        streak_risk_enabled: true,
    });

    // Check if push notifications are enabled
    useEffect(() => {
        async function checkPush() {
            if (!("Notification" in window) || !("serviceWorker" in navigator)) {
                setPushEnabled(false);
                return;
            }

            const permission = Notification.permission;
            if (permission !== "granted") {
                setPushEnabled(false);
                return;
            }

            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setPushEnabled(!!subscription);
            } catch {
                setPushEnabled(false);
            }
        }
        checkPush();
    }, []);

    // Load preferences
    useEffect(() => {
        async function loadPrefs() {
            if (!accessToken) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch("/api/notifications/preferences", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.preferences) {
                        setPrefs(prev => ({ ...prev, ...data.preferences }));
                    }
                }
            } catch (err) {
                console.error("Failed to load notification preferences:", err);
            } finally {
                setLoading(false);
            }
        }
        loadPrefs();
    }, [accessToken]);

    async function savePrefs(updates: Partial<NotificationPrefs>) {
        if (!accessToken) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/notifications/preferences", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(updates),
            });

            if (!res.ok) {
                throw new Error("Failed to save preferences");
            }

            setPrefs(prev => ({ ...prev, ...updates }));
            setSuccess("Saved");
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    async function handleEnablePush() {
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                // Reload page to trigger the subscription flow
                window.location.reload();
            }
        } catch (err) {
            setError("Could not enable notifications");
        }
    }

    if (loading) {
        return (
            <div className="mt-4 flex items-center gap-2 text-sm app-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                Loading preferences...
            </div>
        );
    }

    // Show enable button if push is not set up
    if (!pushEnabled) {
        return (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔔</span>
                    <div className="flex-1">
                        <p className="font-medium text-amber-200">Push notifications not enabled</p>
                        <p className="text-sm text-amber-200/70">Enable them to receive daily reminders</p>
                    </div>
                    <button
                        onClick={handleEnablePush}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-amber-400"
                    >
                        Enable
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-4">
            {/* Daily Reminder Toggle */}
            <div className="flex items-center justify-between rounded-2xl border app-panel p-4">
                <div>
                    <p className="font-medium">Daily writing reminder</p>
                    <p className="text-sm app-muted">Get notified if you haven't written today</p>
                </div>
                <button
                    onClick={() => savePrefs({ daily_reminder_enabled: !prefs.daily_reminder_enabled })}
                    disabled={saving}
                    className={`relative h-8 w-14 rounded-full transition-colors ${prefs.daily_reminder_enabled
                            ? "bg-indigo-600"
                            : "bg-white/10"
                        }`}
                >
                    <span
                        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.daily_reminder_enabled ? "left-7" : "left-1"
                            }`}
                    />
                </button>
            </div>

            {prefs.daily_reminder_enabled && (
                <>
                    {/* Smart Learning Toggle */}
                    <div className="flex items-center justify-between rounded-2xl border app-panel p-4">
                        <div>
                            <p className="font-medium">Smart timing</p>
                            <p className="text-sm app-muted">Learn when you usually write and remind you then</p>
                        </div>
                        <button
                            onClick={() => savePrefs({ use_smart_learning: !prefs.use_smart_learning })}
                            disabled={saving}
                            className={`relative h-8 w-14 rounded-full transition-colors ${prefs.use_smart_learning
                                    ? "bg-indigo-600"
                                    : "bg-white/10"
                                }`}
                        >
                            <span
                                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.use_smart_learning ? "left-7" : "left-1"
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Manual Time Config (only if smart learning disabled) */}
                    {!prefs.use_smart_learning && (
                        <div className="rounded-2xl border app-panel p-4">
                            <p className="font-medium mb-3">Reminder times</p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm app-muted">Weekdays (Mon-Fri)</label>
                                    <select
                                        value={prefs.weekday_hour}
                                        onChange={(e) => savePrefs({ weekday_hour: parseInt(e.target.value) })}
                                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--app-panel)", borderColor: "var(--app-border)" }}
                                    >
                                        {HOURS.map(h => (
                                            <option key={h} value={h}>{formatHour(h)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm app-muted">Weekends (Sat-Sun)</label>
                                    <select
                                        value={prefs.weekend_hour}
                                        onChange={(e) => savePrefs({ weekend_hour: parseInt(e.target.value) })}
                                        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--app-panel)", borderColor: "var(--app-border)" }}
                                    >
                                        {HOURS.map(h => (
                                            <option key={h} value={h}>{formatHour(h)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Streak Risk Toggle */}
                    <div className="flex items-center justify-between rounded-2xl border app-panel p-4">
                        <div>
                            <p className="font-medium">Streak risk alerts</p>
                            <p className="text-sm app-muted">Extra reminder when your streak is about to break</p>
                        </div>
                        <button
                            onClick={() => savePrefs({ streak_risk_enabled: !prefs.streak_risk_enabled })}
                            disabled={saving}
                            className={`relative h-8 w-14 rounded-full transition-colors ${prefs.streak_risk_enabled
                                    ? "bg-indigo-600"
                                    : "bg-white/10"
                                }`}
                        >
                            <span
                                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${prefs.streak_risk_enabled ? "left-7" : "left-1"
                                    }`}
                            />
                        </button>
                    </div>
                </>
            )}

            {/* Feedback */}
            {success && <p className="text-sm text-emerald-400">{success}</p>}
            {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
    );
}
