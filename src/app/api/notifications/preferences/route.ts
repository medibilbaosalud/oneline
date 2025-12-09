// src/app/api/notifications/preferences/route.ts
// ============================================================
// Notification Preferences API
// ============================================================
// GET: Retrieve user's notification preferences
// POST: Update user's notification preferences
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(req: Request) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return null;
    return user;
}

export async function GET(req: Request) {
    try {
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from("notification_preferences")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (error && error.code !== "PGRST116") {
            throw error;
        }

        // Return defaults if no preferences exist
        const preferences = data || {
            use_smart_learning: true,
            weekday_hour: 20,
            weekday_minute: 0,
            weekend_hour: 11,
            weekend_minute: 0,
            timezone: "Europe/Madrid",
            daily_reminder_enabled: true,
            streak_risk_enabled: true,
            writing_patterns: null,
        };

        return NextResponse.json({ ok: true, preferences });

    } catch (error) {
        console.error("[NotificationPrefs] GET error:", error);
        return NextResponse.json({ error: "Failed to get preferences" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getUser(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            use_smart_learning,
            weekday_hour,
            weekday_minute,
            weekend_hour,
            weekend_minute,
            timezone,
            daily_reminder_enabled,
            streak_risk_enabled,
        } = body;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Build update object with only provided fields
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (typeof use_smart_learning === "boolean") updates.use_smart_learning = use_smart_learning;
        if (typeof weekday_hour === "number") updates.weekday_hour = weekday_hour;
        if (typeof weekday_minute === "number") updates.weekday_minute = weekday_minute;
        if (typeof weekend_hour === "number") updates.weekend_hour = weekend_hour;
        if (typeof weekend_minute === "number") updates.weekend_minute = weekend_minute;
        if (typeof timezone === "string") updates.timezone = timezone;
        if (typeof daily_reminder_enabled === "boolean") updates.daily_reminder_enabled = daily_reminder_enabled;
        if (typeof streak_risk_enabled === "boolean") updates.streak_risk_enabled = streak_risk_enabled;

        const { error } = await supabase
            .from("notification_preferences")
            .upsert({
                user_id: user.id,
                ...updates,
            }, { onConflict: "user_id" });

        if (error) throw error;

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("[NotificationPrefs] POST error:", error);
        return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
    }
}
