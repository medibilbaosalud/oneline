// src/app/api/cron/daily-reminders/route.ts
// ============================================================
// Daily Reminders Cron Job
// ============================================================
// Called by cron-job.org every 15 minutes to send push notifications
// to users who haven't written today at their optimal time.
//
// Authentication: Requires CRON_SECRET header to prevent abuse
// ============================================================

import { NextResponse } from "next/server";
import { sendPushToUser, isPushConfigured } from "@/lib/pushNotifications";
import { getUsersToNotify, markReminderSent } from "@/lib/notificationScheduler";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Force dynamic to prevent caching
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Variety of notification messages
const DAILY_MESSAGES = [
    { title: "¿Cómo fue tu día?", body: "Solo una línea. Tu yo futuro te lo agradecerá." },
    { title: "Tu diario te espera ✨", body: "333 caracteres para capturar este momento." },
    { title: "Momento de reflexión 🌙", body: "¿Qué fue lo más importante de hoy?" },
    { title: "Hey 👋", body: "No olvides tu entrada de hoy." },
    { title: "Una línea, un día 📝", body: "Escribe algo antes de que termine el día." },
];

// Messages for users with active streaks
const STREAK_MESSAGES = [
    { title: "🔥 Tu racha sigue viva", body: "Escribe hoy para mantenerla." },
    { title: "Keep the fire burning 🔥", body: "Tu racha te espera." },
];

function getRandomMessage(hasStreak: boolean): { title: string; body: string } {
    const messages = hasStreak ? STREAK_MESSAGES : DAILY_MESSAGES;
    return messages[Math.floor(Math.random() * messages.length)];
}

export async function GET(req: Request) {
    try {
        // Verify cron secret for security
        const cronSecret = process.env.CRON_SECRET;
        const authHeader = req.headers.get("x-cron-secret") || req.headers.get("authorization");

        if (cronSecret && authHeader !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            console.log("[DailyReminders] ❌ Invalid cron secret");
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        // Check if push is configured
        if (!isPushConfigured()) {
            console.log("[DailyReminders] ⚠️ Push notifications not configured");
            return NextResponse.json({ ok: false, error: "Push not configured" }, { status: 500 });
        }

        console.log("[DailyReminders] 🔔 Starting notification run...");

        // Get users who should receive notification now
        const usersToNotify = await getUsersToNotify();
        console.log(`[DailyReminders] Found ${usersToNotify.length} users to notify`);

        if (usersToNotify.length === 0) {
            return NextResponse.json({ ok: true, sent: 0, message: "No users to notify right now" });
        }

        // Get streak info for personalized messages
        const supabase = supabaseAdmin();
        const { data: streaks } = await supabase
            .from("user_streaks")
            .select("user_id, current_streak")
            .in("user_id", usersToNotify);

        const streakMap = new Map(streaks?.map(s => [s.user_id, s.current_streak]) || []);

        // Send notifications
        let sent = 0;
        const errors: string[] = [];

        for (const userId of usersToNotify) {
            try {
                const hasStreak = (streakMap.get(userId) || 0) > 0;
                const message = getRandomMessage(hasStreak);

                const result = await sendPushToUser(userId, {
                    title: message.title,
                    body: message.body,
                    icon: "/icons/icon-192x192.png",
                    badge: "/icons/badge-72x72.png",
                    url: "/today",
                });

                if (result.sent > 0) {
                    sent++;
                    await markReminderSent(userId);
                    console.log(`[DailyReminders] ✅ Sent to user ${userId.slice(0, 8)}...`);
                }
            } catch (err) {
                console.error(`[DailyReminders] ❌ Error sending to ${userId.slice(0, 8)}:`, err);
                errors.push(userId);
            }
        }

        console.log(`[DailyReminders] 📊 Summary: ${sent} sent, ${errors.length} errors`);

        return NextResponse.json({
            ok: true,
            sent,
            total: usersToNotify.length,
            errors: errors.length,
        });

    } catch (error) {
        console.error("[DailyReminders] Fatal error:", error);
        return NextResponse.json(
            { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}

// Also support POST for flexibility
export async function POST(req: Request) {
    return GET(req);
}
