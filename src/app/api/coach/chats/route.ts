// src/app/api/coach/chats/route.ts
// ============================================================
// Coach Chats List API - List all saved conversations
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: Request) {
    try {
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

        // Get all conversations for this user
        const { data: chats, error } = await supabase
            .from("coach_conversations")
            .select("id, messages, updated_at")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

        if (error) {
            console.error("[Coach Chats] Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform to list format with preview
        const chatList = (chats || []).map(chat => {
            const msgs = chat.messages || [];
            const lastUserMsg = [...msgs].reverse().find((m: { role: string }) => m.role === "user");
            const preview = lastUserMsg?.content?.slice(0, 80) || "No messages";

            return {
                id: chat.id,
                updated_at: chat.updated_at,
                messageCount: msgs.length,
                preview: preview + (preview.length >= 80 ? "..." : ""),
            };
        });

        return NextResponse.json({ chats: chatList });

    } catch (error) {
        console.error("[Coach Chats] Error:", error);
        return NextResponse.json({ error: "Failed to load chats" }, { status: 500 });
    }
}
