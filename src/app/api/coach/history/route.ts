// src/app/api/coach/history/route.ts
// ============================================================
// Coach History API - Load saved conversations
// ============================================================
// This endpoint returns the user's saved Coach conversations
// so they can continue where they left off.
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadCoachMemory } from "@/lib/coachMemory";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
    try {
        // Get auth token from header
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create Supabase client
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Load conversation history using the memory service
        const { recentMessages, historySummary } = await loadCoachMemory(user.id);

        return NextResponse.json({
            messages: recentMessages.map(m => ({
                id: `saved-${m.timestamp}`,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
            })),
            summary: historySummary,
            hasHistory: recentMessages.length > 0 || !!historySummary,
        });

    } catch (error) {
        console.error("[Coach History] Error:", error);
        return NextResponse.json(
            { error: "Failed to load history" },
            { status: 500 }
        );
    }
}
