// src/app/api/debug/create-notification/route.ts
// ============================================================
// Debug endpoint for testing push notifications
// ============================================================
// This route creates a test notification AND sends an actual push
// notification to the user's subscribed devices.
// 
// Only for testing - not for production use.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createNotification } from "@/lib/createNotification";
import { sendPushToUser, isPushConfigured } from "@/lib/pushNotifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  try {
    // Get authenticated user
    const sb = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Create in-app notification (stored in database)
    await createNotification({
      userId: user.id,
      type: "system",
      title: "Test notification",
      body: "This is a test notification.",
    });

    // Also send real push notification if configured
    let pushResult = { sent: 0, failed: [] as string[] };
    let pushError: string | null = null;

    if (isPushConfigured()) {
      try {
        pushResult = await sendPushToUser(user.id, {
          title: "🔔 OneLine Test",
          body: "Your push notifications are working!",
          url: "/settings",
        });
      } catch (err) {
        pushError = err instanceof Error ? err.message : "Unknown push error";
        console.error("[debug/create-notification] Push error:", err);
      }
    } else {
      pushError = "VAPID keys not configured";
    }

    return NextResponse.json({
      ok: true,
      inAppCreated: true,
      pushSent: pushResult.sent,
      pushFailed: pushResult.failed.length,
      pushError,
    });
  } catch (error) {
    console.error("[debug/create-notification] Error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
