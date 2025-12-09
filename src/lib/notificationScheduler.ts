// src/lib/notificationScheduler.ts
// ============================================================
// Smart Notification Scheduler
// ============================================================
// Handles learning user writing patterns and calculating optimal
// notification times per day of week.
// ============================================================

import { supabaseAdmin } from "./supabaseAdmin";

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];
const MAX_TIMES_PER_DAY = 10; // Keep last 10 writing times per day

type WritingPatterns = {
    [key in DayOfWeek]: {
        avg_hour: number | null;
        times: number[];
    };
};

type NotificationPreferences = {
    user_id: string;
    use_smart_learning: boolean;
    weekday_hour: number;
    weekday_minute: number;
    weekend_hour: number;
    weekend_minute: number;
    timezone: string;
    writing_patterns: WritingPatterns;
    daily_reminder_enabled: boolean;
    last_reminder_sent_at: string | null;
};

/**
 * Record when a user writes an entry to learn their patterns
 */
export async function recordWritingTime(userId: string): Promise<void> {
    const supabase = supabaseAdmin();
    const now = new Date();
    const dayOfWeek = DAYS_OF_WEEK[now.getDay()];
    const hour = now.getHours() + now.getMinutes() / 60; // e.g., 20.5 for 20:30

    // Get current preferences
    const { data: prefs, error: fetchError } = await supabase
        .from("notification_preferences")
        .select("writing_patterns")
        .eq("user_id", userId)
        .single();

    if (fetchError && fetchError.code !== "PGRST116") {
        console.error("[NotificationScheduler] Error fetching preferences:", fetchError);
        return;
    }

    // Initialize patterns if needed
    const patterns: WritingPatterns = prefs?.writing_patterns || {
        sunday: { avg_hour: null, times: [] },
        monday: { avg_hour: null, times: [] },
        tuesday: { avg_hour: null, times: [] },
        wednesday: { avg_hour: null, times: [] },
        thursday: { avg_hour: null, times: [] },
        friday: { avg_hour: null, times: [] },
        saturday: { avg_hour: null, times: [] },
    };

    // Add new time (keep last N)
    const dayPattern = patterns[dayOfWeek];
    dayPattern.times = [...dayPattern.times, hour].slice(-MAX_TIMES_PER_DAY);

    // Recalculate average for this day
    if (dayPattern.times.length > 0) {
        const sum = dayPattern.times.reduce((a, b) => a + b, 0);
        dayPattern.avg_hour = Math.round((sum / dayPattern.times.length) * 2) / 2; // Round to nearest 0.5
    }

    // Update in database
    const { error: updateError } = await supabase
        .from("notification_preferences")
        .upsert({
            user_id: userId,
            writing_patterns: patterns,
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

    if (updateError) {
        console.error("[NotificationScheduler] Error updating patterns:", updateError);
    } else {
        console.log(`[NotificationScheduler] Recorded writing time for ${dayOfWeek}: ${hour.toFixed(1)}h`);
    }
}

/**
 * Get the optimal notification hour for a user on a given day
 */
export function getOptimalHour(
    prefs: NotificationPreferences,
    dayOfWeek: DayOfWeek
): { hour: number; minute: number } {
    // If smart learning is disabled, use manual settings
    if (!prefs.use_smart_learning) {
        const isWeekend = dayOfWeek === "saturday" || dayOfWeek === "sunday";
        return {
            hour: isWeekend ? prefs.weekend_hour : prefs.weekday_hour,
            minute: isWeekend ? prefs.weekend_minute : prefs.weekday_minute,
        };
    }

    // Try to use learned pattern for this day
    const dayPattern = prefs.writing_patterns?.[dayOfWeek];
    if (dayPattern?.avg_hour !== null && dayPattern?.avg_hour !== undefined) {
        // Send notification 30 minutes before they usually write
        const optimalHour = Math.max(0, dayPattern.avg_hour - 0.5);
        return {
            hour: Math.floor(optimalHour),
            minute: (optimalHour % 1) * 60,
        };
    }

    // Fallback to defaults
    const isWeekend = dayOfWeek === "saturday" || dayOfWeek === "sunday";
    return {
        hour: isWeekend ? prefs.weekend_hour : prefs.weekday_hour,
        minute: isWeekend ? prefs.weekend_minute : prefs.weekday_minute,
    };
}

/**
 * Check if it's time to send a notification to a user
 */
export function shouldSendNow(
    prefs: NotificationPreferences,
    currentHour: number,
    currentMinute: number,
    dayOfWeek: DayOfWeek
): boolean {
    const optimal = getOptimalHour(prefs, dayOfWeek);

    // Check if within 15-minute window of optimal time
    const optimalMinutes = optimal.hour * 60 + optimal.minute;
    const currentMinutes = currentHour * 60 + currentMinute;
    const diff = Math.abs(currentMinutes - optimalMinutes);

    return diff <= 15; // Within 15 minutes of optimal time
}

/**
 * Get users who should receive a notification right now
 */
export async function getUsersToNotify(): Promise<string[]> {
    const supabase = supabaseAdmin();
    const now = new Date();
    const dayOfWeek = DAYS_OF_WEEK[now.getDay()];
    const todayDate = now.toISOString().slice(0, 10);

    // Get all users with notifications enabled
    const { data: allPrefs, error: prefsError } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("daily_reminder_enabled", true);

    if (prefsError || !allPrefs) {
        console.error("[NotificationScheduler] Error fetching preferences:", prefsError);
        return [];
    }

    // Get users who have push subscriptions
    const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("user_id, timezone")
        .in("user_id", allPrefs.map(p => p.user_id));

    if (subError) {
        console.error("[NotificationScheduler] Error fetching subscriptions:", subError);
        return [];
    }

    const subscribedUserIds = new Set(subscriptions?.map(s => s.user_id) || []);
    const userTimezones = new Map(subscriptions?.map(s => [s.user_id, s.timezone || "Europe/Madrid"]) || []);

    // Get users who already wrote today
    const { data: todayEntries, error: entriesError } = await supabase
        .from("journal")
        .select("user_id")
        .gte("created_at", `${todayDate}T00:00:00Z`)
        .lte("created_at", `${todayDate}T23:59:59Z`);

    if (entriesError) {
        console.error("[NotificationScheduler] Error fetching today's entries:", entriesError);
    }

    const wroteToday = new Set(todayEntries?.map(e => e.user_id) || []);

    // Filter users who should receive notification now
    const usersToNotify: string[] = [];

    for (const prefs of allPrefs) {
        // Skip if no push subscription
        if (!subscribedUserIds.has(prefs.user_id)) continue;

        // Skip if already wrote today
        if (wroteToday.has(prefs.user_id)) continue;

        // Skip if already sent today
        if (prefs.last_reminder_sent_at) {
            const lastSent = new Date(prefs.last_reminder_sent_at);
            if (lastSent.toISOString().slice(0, 10) === todayDate) continue;
        }

        // Get user's local time
        const timezone = userTimezones.get(prefs.user_id) || "Europe/Madrid";
        const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
        const localHour = localTime.getHours();
        const localMinute = localTime.getMinutes();
        const localDayOfWeek = DAYS_OF_WEEK[localTime.getDay()];

        // Check if it's time to notify
        if (shouldSendNow(prefs, localHour, localMinute, localDayOfWeek)) {
            usersToNotify.push(prefs.user_id);
        }
    }

    return usersToNotify;
}

/**
 * Mark that a reminder was sent to a user
 */
export async function markReminderSent(userId: string): Promise<void> {
    const supabase = supabaseAdmin();
    await supabase
        .from("notification_preferences")
        .update({
            last_reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
}
