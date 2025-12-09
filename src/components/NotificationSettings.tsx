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

// Generate time slots every 15 minutes
const TIME_SLOTS: { hour: number; minute: number; label: string }[] = [];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? "AM" : "PM";
        const minStr = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
        TIME_SLOTS.push({
            hour: h,
            minute: m,
            label: `${hour12}${minStr} ${ampm}`,
        });
    }
}

function findClosestSlot(hour: number, minute: number): { hour: number; minute: number } {
    // Round to nearest 15 minutes
    const totalMins = hour * 60 + minute;
    const rounded = Math.round(totalMins / 15) * 15;
    return {
        hour: Math.floor(rounded / 60) % 24,
        minute: rounded % 60,
    };
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
        } catch {
            setError("Could not enable notifications");
        }
    }

    function handleTimeChange(type: "weekday" | "weekend", slotIndex: number) {
        const slot = TIME_SLOTS[slotIndex];
        if (!slot) return;

        if (type === "weekday") {
            savePrefs({ weekday_hour: slot.hour, weekday_minute: slot.minute });
        } else {
            savePrefs({ weekend_hour: slot.hour, weekend_minute: slot.minute });
        }
    }

    function getCurrentSlotIndex(hour: number, minute: number): number {
        const closest = findClosestSlot(hour, minute);
        return TIME_SLOTS.findIndex(s => s.hour === closest.hour && s.minute === closest.minute);
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
                            <div className="flex items-center justify-between mb-4">
                                <p className="font-medium">Custom reminder times</p>
                                {success && <span className="text-xs text-emerald-400">{success}</span>}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {/* Weekdays */}
                                <div className="rounded-xl bg-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">📅</span>
                                        <span className="text-sm font-medium">Weekdays</span>
                                        <span className="text-xs app-muted">(Mon-Fri)</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {TIME_SLOTS.filter((_, i) => i % 4 === 0).map((slot, idx) => {
                                            const actualIdx = idx * 4;
                                            const isSelected = prefs.weekday_hour === slot.hour && prefs.weekday_minute === slot.minute;
                                            return (
                                                <button
                                                    key={`wd-${slot.hour}-${slot.minute}`}
                                                    onClick={() => handleTimeChange("weekday", actualIdx)}
                                                    className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${isSelected
                                                            ? "bg-indigo-600 text-white"
                                                            : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Fine-tune with 15 min intervals */}
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs app-muted">Fine-tune:</span>
                                        <select
                                            value={getCurrentSlotIndex(prefs.weekday_hour, prefs.weekday_minute)}
                                            onChange={(e) => handleTimeChange("weekday", parseInt(e.target.value))}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"
                                        >
                                            {TIME_SLOTS.map((slot, idx) => (
                                                <option key={idx} value={idx}>
                                                    {slot.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Weekends */}
                                <div className="rounded-xl bg-white/5 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-lg">🌴</span>
                                        <span className="text-sm font-medium">Weekends</span>
                                        <span className="text-xs app-muted">(Sat-Sun)</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        {TIME_SLOTS.filter((_, i) => i % 4 === 0).map((slot, idx) => {
                                            const actualIdx = idx * 4;
                                            const isSelected = prefs.weekend_hour === slot.hour && prefs.weekend_minute === slot.minute;
                                            return (
                                                <button
                                                    key={`we-${slot.hour}-${slot.minute}`}
                                                    onClick={() => handleTimeChange("weekend", actualIdx)}
                                                    className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${isSelected
                                                            ? "bg-indigo-600 text-white"
                                                            : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                                                        }`}
                                                >
                                                    {slot.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Fine-tune with 15 min intervals */}
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs app-muted">Fine-tune:</span>
                                        <select
                                            value={getCurrentSlotIndex(prefs.weekend_hour, prefs.weekend_minute)}
                                            onChange={(e) => handleTimeChange("weekend", parseInt(e.target.value))}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs"
                                        >
                                            {TIME_SLOTS.map((slot, idx) => (
                                                <option key={idx} value={idx}>
                                                    {slot.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
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

            {/* Error display */}
            {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
    );
}
