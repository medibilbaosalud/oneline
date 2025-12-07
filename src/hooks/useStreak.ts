// src/hooks/useStreak.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import {
    getOrCreateStreak,
    recordDailyEntry,
    getActivityHistory,
    getUserBadges,
    isStreakAtRisk,
    hasWrittenToday,
    type UserStreak,
    type DailyActivity,
} from "@/lib/streakService";

export type UseStreakResult = {
    streak: UserStreak | null;
    activity: DailyActivity[];
    badges: string[];
    loading: boolean;
    error: string | null;
    isAtRisk: boolean;
    hasWrittenToday: boolean;
    recordEntry: () => Promise<void>;
    refresh: () => Promise<void>;
};

export function useStreak(): UseStreakResult {
    const [streak, setStreak] = useState<UserStreak | null>(null);
    const [activity, setActivity] = useState<DailyActivity[]>([]);
    const [badges, setBadges] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [writtenToday, setWrittenToday] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Get user ID
    useEffect(() => {
        (async () => {
            const supabase = supabaseBrowser();
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user?.id ?? null);
        })();
    }, []);

    // Load streak data
    const loadData = useCallback(async () => {
        if (!userId) return;

        setLoading(true);
        setError(null);

        try {
            const [streakData, activityData, badgesData, written] = await Promise.all([
                getOrCreateStreak(userId),
                getActivityHistory(userId, 84), // 12 weeks
                getUserBadges(userId),
                hasWrittenToday(userId),
            ]);

            setStreak(streakData);
            setActivity(activityData);
            setBadges(badgesData);
            setWrittenToday(written);
        } catch (err) {
            console.error("Error loading streak data:", err);
            setError(err instanceof Error ? err.message : "Failed to load streak data");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            loadData();
        }
    }, [userId, loadData]);

    // Record a new entry
    const recordEntry = useCallback(async () => {
        if (!userId) return;

        try {
            const updatedStreak = await recordDailyEntry(userId);
            if (updatedStreak) {
                setStreak(updatedStreak);
                setWrittenToday(true);
                // Reload badges in case new one was earned
                const newBadges = await getUserBadges(userId);
                setBadges(newBadges);
            }
        } catch (err) {
            console.error("Error recording entry:", err);
        }
    }, [userId]);

    return {
        streak,
        activity,
        badges,
        loading,
        error,
        isAtRisk: streak ? isStreakAtRisk(streak) : false,
        hasWrittenToday: writtenToday,
        recordEntry,
        refresh: loadData,
    };
}
