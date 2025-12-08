// src/app/api/coach/finish/route.ts
// ============================================================
// Coach Finish Chat API - Summarize and save to user profile
// ============================================================
// When user clicks "Finish Chat", this endpoint:
// 1. Receives the conversation messages
// 2. Calls LLM to generate a summary/insights
// 3. Appends insights to coach_user_profile.accumulated_insights
// 4. Updates the conversation record with summary
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chatWithGroq } from "@/lib/groqClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Prompt for summarizing the conversation and extracting name
const SUMMARY_PROMPT = `You are an AI assistant helping to maintain context about a user across coaching conversations.

Analyze this coaching conversation and respond with a JSON object containing:
1. "summary": A BRIEF summary (2-4 sentences) capturing key emotions, struggles, insights, and topics discussed. Write about "the user" in third person.
2. "userName": The user's name if they shared it, or null if not mentioned/declined to share.

If nothing meaningful was discussed, use: "Brief chat with no significant insights."
Be concise but capture the essence.

Respond ONLY with valid JSON, no other text. Example:
{"summary": "The user expressed feeling anxious about work deadlines...", "userName": "María"}
or
{"summary": "Brief chat about morning routines...", "userName": null}

Conversation:
`;

export async function POST(req: Request) {
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

        const body = await req.json();
        const { messages, conversationId } = body;

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages to summarize" }, { status: 400 });
        }

        // Format conversation for summarization
        const conversationText = messages
            .filter((m: { role: string }) => m.role !== "system")
            .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
            .join("\n\n");

        console.log("[Coach Finish] Summarizing conversation with", messages.length, "messages");

        // Call LLM to summarize (returns JSON)
        const { reply: rawResponse } = await chatWithGroq([
            { role: "user", content: SUMMARY_PROMPT + conversationText }
        ], {
            temperature: 0.3,
            maxTokens: 400,
        });

        console.log("[Coach Finish] LLM response:", rawResponse.slice(0, 150) + "...");

        // Parse JSON response
        let summary = "Brief chat with insights.";
        let extractedName: string | null = null;

        try {
            // Try to parse as JSON
            const parsed = JSON.parse(rawResponse.trim());
            summary = parsed.summary || summary;
            extractedName = parsed.userName || null;
            console.log("[Coach Finish] Parsed - summary:", summary.slice(0, 50), "name:", extractedName);
        } catch {
            // Fallback: treat the whole response as summary
            summary = rawResponse.trim();
            console.log("[Coach Finish] Fallback to raw summary (not JSON)");
        }

        // Get current user profile
        const { data: profile } = await supabase
            .from("coach_user_profile")
            .select("accumulated_insights, total_chats, display_name, memory_enabled")
            .eq("user_id", user.id)
            .single();

        // Check if memory is enabled (default to true for backwards compatibility)
        const memoryEnabled = profile?.memory_enabled !== false;

        // Build new accumulated insights (only if memory enabled)
        let accumulatedInsights = profile?.accumulated_insights || "";

        if (memoryEnabled) {
            const timestamp = new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            const newInsight = `[${timestamp}] ${summary}`;

            if (accumulatedInsights) {
                accumulatedInsights = accumulatedInsights + "\n\n" + newInsight;
            } else {
                accumulatedInsights = newInsight;
            }

            // Limit accumulated insights to ~4000 chars to avoid context overflow
            if (accumulatedInsights.length > 4000) {
                const insights = accumulatedInsights.split("\n\n");
                while (accumulatedInsights.length > 4000 && insights.length > 1) {
                    insights.shift();
                    accumulatedInsights = insights.join("\n\n");
                }
            }
        }

        // Determine display name (use existing or newly extracted, never overwrite with null)
        const displayName = profile?.display_name || extractedName;

        // Upsert user profile
        const { error: profileError } = await supabase
            .from("coach_user_profile")
            .upsert({
                user_id: user.id,
                display_name: displayName,
                accumulated_insights: memoryEnabled ? accumulatedInsights : profile?.accumulated_insights,
                total_chats: (profile?.total_chats || 0) + 1,
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

        if (profileError) {
            console.error("[Coach Finish] Profile update error:", profileError);
            // Don't fail the request, just log
        } else {
            console.log("[Coach Finish] Profile updated successfully");
        }

        // Update coach_conversations summary
        // Find the latest conversation for this user and update its summary
        const { data: latestConversation } = await supabase
            .from("coach_conversations")
            .select("id")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

        if (latestConversation) {
            const { error: convError } = await supabase
                .from("coach_conversations")
                .update({ summary })
                .eq("id", latestConversation.id);

            if (convError) {
                console.error("[Coach Finish] Conversation summary update error:", convError);
            } else {
                console.log("[Coach Finish] Conversation summary updated for:", latestConversation.id);
            }
        } else {
            console.log("[Coach Finish] No conversation found to update summary");
        }

        return NextResponse.json({
            success: true,
            summary,
            totalChats: (profile?.total_chats || 0) + 1,
        });

    } catch (error) {
        console.error("[Coach Finish] Error:", error);
        return NextResponse.json({ error: "Failed to finish chat" }, { status: 500 });
    }
}
