// src/lib/streakService.ts
// Service for managing user streaks and engagement

import { supabaseBrowser } from "@/lib/supabaseBrowser";

export type UserStreak = {
    id: string;
    user_id: string;
    current_streak: number;
    longest_streak: number;
    last_entry_date: string | null;
    freeze_tokens: number;
    fire_level: number;
    total_entries: number;
    created_at: string;
    updated_at: string;
};

export type DailyActivity = {
    activity_date: string;
    entries_count: number;
};

/**
 * Calculate fire level based on current streak
 */
export function calculateFireLevel(streak: number): number {
    if (streak <= 0) return 0;
    if (streak <= 2) return 1;
    if (streak <= 6) return 2;
    if (streak <= 13) return 3;
    if (streak <= 29) return 4;
    if (streak <= 59) return 5;
    if (streak <= 99) return 6;
    return 7 + Math.floor((streak - 100) / 50); // Level 7+ for 100+ days
}

/**
 * Get user streak data, creating if doesn't exist
 */
export async function getOrCreateStreak(userId: string): Promise<UserStreak | null> {
    const supabase = supabaseBrowser();

    // Try to get existing streak
    const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (data) return data as UserStreak;

    // If not found, create new streak record
    if (error?.code === "PGRST116") {
        const { data: newData, error: insertError } = await supabase
            .from("user_streaks")
            .insert({
                user_id: userId,
                current_streak: 0,
                longest_streak: 0,
                freeze_tokens: 2,
                fire_level: 0,
                total_entries: 0,
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating streak:", insertError);
            return null;
        }
        return newData as UserStreak;
    }

    console.error("Error fetching streak:", error);
    return null;
}

/**
 * Check if user already wrote today
 */
export async function hasWrittenToday(userId: string): Promise<boolean> {
    const supabase = supabaseBrowser();
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
        .from("user_daily_activity")
        .select("id")
        .eq("user_id", userId)
        .eq("activity_date", today)
        .single();

    return !!data;
}

/**
 * Record that user wrote an entry today and update streak
 */
export async function recordDailyEntry(userId: string): Promise<UserStreak | null> {
    const supabase = supabaseBrowser();
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Get current streak
    const streak = await getOrCreateStreak(userId);
    if (!streak) return null;

    // Check if already logged today
    const alreadyWritten = await hasWrittenToday(userId);
    if (alreadyWritten) {
        // Just increment entry count, don't update streak
        await supabase
            .from("user_daily_activity")
            .update({ entries_count: streak.total_entries + 1 })
            .eq("user_id", userId)
            .eq("activity_date", today);
        return streak;
    }

    // Calculate new streak
    let newStreak = 1;
    if (streak.last_entry_date === yesterday) {
        // Consecutive day - increment streak
        newStreak = streak.current_streak + 1;
    } else if (streak.last_entry_date === today) {
        // Already written today - keep current
        newStreak = streak.current_streak;
    }
    // Otherwise reset to 1 (streak broken)

    const newLongest = Math.max(streak.longest_streak, newStreak);
    const newFireLevel = calculateFireLevel(newStreak);

    // Update streak
    const { data: updatedStreak, error: updateError } = await supabase
        .from("user_streaks")
        .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_entry_date: today,
            fire_level: newFireLevel,
            total_entries: streak.total_entries + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

    if (updateError) {
        console.error("Error updating streak:", updateError);
        return null;
    }

    // Record daily activity
    await supabase
        .from("user_daily_activity")
        .upsert({
            user_id: userId,
            activity_date: today,
            entries_count: 1,
        }, { onConflict: "user_id,activity_date" });

    // Check for milestone badges
    await checkAndAwardBadges(userId, newStreak);

    return updatedStreak as UserStreak;
}

/**
 * Get activity for the last N days (for calendar)
 */
export async function getActivityHistory(userId: string, days: number = 84): Promise<DailyActivity[]> {
    const supabase = supabaseBrowser();
    const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from("user_daily_activity")
        .select("activity_date, entries_count")
        .eq("user_id", userId)
        .gte("activity_date", startDate)
        .order("activity_date", { ascending: true });

    if (error) {
        console.error("Error fetching activity:", error);
        return [];
    }

    return (data ?? []) as DailyActivity[];
}

/**
 * Check and award badges for streak milestones
 */
async function checkAndAwardBadges(userId: string, streak: number): Promise<void> {
    const milestones = [7, 30, 100, 365];
    const supabase = supabaseBrowser();

    for (const milestone of milestones) {
        if (streak >= milestone) {
            const badgeType = `streak_${milestone}`;

            // Try to insert (will fail silently if already exists due to unique constraint)
            await supabase
                .from("user_badges")
                .upsert({
                    user_id: userId,
                    badge_type: badgeType,
                }, { onConflict: "user_id,badge_type" });
        }
    }
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<string[]> {
    const supabase = supabaseBrowser();

    const { data, error } = await supabase
        .from("user_badges")
        .select("badge_type")
        .eq("user_id", userId);

    if (error) {
        console.error("Error fetching badges:", error);
        return [];
    }

    return (data ?? []).map(b => b.badge_type);
}

/**
 * Check if streak is at risk (didn't write today yet)
 */
export function isStreakAtRisk(streak: UserStreak): boolean {
    if (!streak.last_entry_date) return false;
    if (streak.current_streak === 0) return false;

    const today = new Date().toISOString().slice(0, 10);
    return streak.last_entry_date !== today;
}

/**
 * Use a freeze token to save streak
 */
export async function useFreeze(userId: string): Promise<boolean> {
    const supabase = supabaseBrowser();
    const streak = await getOrCreateStreak(userId);

    if (!streak || streak.freeze_tokens <= 0) return false;

    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
        .from("user_streaks")
        .update({
            freeze_tokens: streak.freeze_tokens - 1,
            last_entry_date: today, // Pretend they wrote today
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

    return !error;
}
