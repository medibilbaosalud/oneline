// src/app/api/push/subscribe/route.ts
// Handles Web Push notification subscriptions (subscribe/unsubscribe)
// Uses VAPID for authentication with push services

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: Must be SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_SERVICE_KEY)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subscription = await req.json();

        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
        }

        // Store subscription
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
            .from("push_subscriptions")
            .upsert({
                user_id: user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            }, { onConflict: "user_id,endpoint" });

        if (insertError) {
            console.error("Error saving subscription:", insertError);
            return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Push subscribe error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// DELETE - Unsubscribe
export async function DELETE(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { endpoint } = await req.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Push unsubscribe error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
