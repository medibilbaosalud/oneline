// src/lib/pushNotifications.ts
// ============================================================
// Web Push Notification Service
// ============================================================
// This utility handles sending real push notifications to mobile/desktop devices.
// It uses the Web Push protocol with VAPID authentication.
//
// REQUIRED ENV VARS:
// - NEXT_PUBLIC_VAPID_PUBLIC_KEY: Public VAPID key (shared with browser)
// - VAPID_PRIVATE_KEY: Private VAPID key (server only, never expose!)
// - VAPID_SUBJECT: Contact email (mailto:your@email.com)
//
// To generate VAPID keys, run: npx web-push generate-vapid-keys
// ============================================================

import webpush from "web-push";
import { supabaseAdmin } from "./supabaseAdmin";

// Configure VAPID details for push authentication
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:push@oneline.app";

// Initialize web-push with VAPID keys
if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/**
 * Push notification payload type
 */
export type PushPayload = {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    data?: Record<string, unknown>;
};

/**
 * Send a push notification to all subscribed devices for a user
 * 
 * @param userId - The user's ID from Supabase auth
 * @param payload - The notification content (title, body, etc.)
 * @returns Object with success count and failed endpoints
 */
export async function sendPushToUser(
    userId: string,
    payload: PushPayload
): Promise<{ sent: number; failed: string[] }> {
    // Check if VAPID is configured
    if (!vapidPublicKey || !vapidPrivateKey) {
        console.error("[Push] VAPID keys not configured");
        throw new Error("Push notifications not configured on server");
    }

    const supabase = supabaseAdmin();

    // Get all push subscriptions for this user
    // A user might have multiple devices (phone, tablet, desktop)
    const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", userId);

    if (error) {
        console.error("[Push] Failed to fetch subscriptions:", error);
        throw new Error("Failed to fetch push subscriptions");
    }

    if (!subscriptions || subscriptions.length === 0) {
        console.log("[Push] No subscriptions found for user:", userId);
        return { sent: 0, failed: [] };
    }

    // Prepare the notification payload
    const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: payload.badge || "/icons/badge-72x72.png",
        data: {
            url: payload.url || "/",
            ...payload.data,
        },
    });

    let sent = 0;
    const failed: string[] = [];

    // Send to each subscribed device
    for (const sub of subscriptions) {
        try {
            // Reconstruct the PushSubscription object expected by web-push
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            };

            await webpush.sendNotification(pushSubscription, notificationPayload);
            sent++;
            console.log("[Push] ✅ Sent to:", sub.endpoint.slice(0, 50) + "...");
        } catch (err) {
            const error = err as { statusCode?: number };
            console.error("[Push] ❌ Failed:", sub.endpoint.slice(0, 50), error);

            // If subscription is expired/invalid (410 Gone), remove it
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log("[Push] Removing expired subscription");
                await supabase
                    .from("push_subscriptions")
                    .delete()
                    .eq("endpoint", sub.endpoint);
            }

            failed.push(sub.endpoint);
        }
    }

    console.log(`[Push] Summary: ${sent} sent, ${failed.length} failed`);
    return { sent, failed };
}

/**
 * Check if push notifications are properly configured
 */
export function isPushConfigured(): boolean {
    return !!(vapidPublicKey && vapidPrivateKey);
}

/**
 * Get the public VAPID key (for browser subscription)
 */
export function getVapidPublicKey(): string | null {
    return vapidPublicKey || null;
}
