// src/app/api/notifications/record-writing-time/route.ts
// ============================================================
// Record Writing Time API
// ============================================================
// Called when a user saves a journal entry to learn their writing patterns
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recordWritingTime } from "@/lib/notificationScheduler";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
    try {
        // Authenticate user
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

        // Record the writing time for learning
        await recordWritingTime(user.id);

        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error("[RecordWritingTime] Error:", error);
        return NextResponse.json(
            { error: "Failed to record writing time" },
            { status: 500 }
        );
    }
}
