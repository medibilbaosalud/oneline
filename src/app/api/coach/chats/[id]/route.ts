// src/app/api/coach/chats/[id]/route.ts
// ============================================================
// Coach Chat by ID - Load a specific conversation
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.replace("Bearer ", "");

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get specific conversation (must belong to user)
        const { data: chat, error } = await supabase
            .from("coach_conversations")
            .select("id, messages, summary, updated_at")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (error || !chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: chat.id,
            messages: (chat.messages || []).map((m: { role: string; content: string; timestamp: string }) => ({
                id: `loaded-${m.timestamp}`,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
            })),
            summary: chat.summary,
            updated_at: chat.updated_at,
        });

    } catch (error) {
        console.error("[Coach Chat ID] Error:", error);
        return NextResponse.json({ error: "Failed to load chat" }, { status: 500 });
    }
}
