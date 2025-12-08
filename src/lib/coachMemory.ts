// src/lib/coachMemory.ts
// ============================================================
// Coach Memory Service - Persistent Conversation Context
// ============================================================
// This module handles saving and retrieving Coach conversation history.
// It allows the AI Coach to remember previous conversations and build
// context over time, providing more personalized and connected responses.
//
// FEATURES:
// - Saves conversations to Supabase
// - Compacts old messages to save tokens/space
// - Loads recent context for each new session
// - Limits memory to avoid context overflow
//
// TABLE REQUIRED: coach_conversations
// - id: UUID (primary key)
// - user_id: UUID (references auth.users)
// - messages: JSONB (array of messages)
// - summary: TEXT (compacted summary of older chats)
// - created_at: TIMESTAMPTZ
// - updated_at: TIMESTAMPTZ
// ============================================================

import { supabaseAdmin } from "./supabaseAdmin";

// Maximum messages to keep in full detail (recent)
const MAX_RECENT_MESSAGES = 20;
// Maximum characters for the compacted summary
const MAX_SUMMARY_LENGTH = 1500;

type StoredMessage = {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
};

type ConversationRecord = {
    id: string;
    user_id: string;
    messages: StoredMessage[];
    summary: string | null;
    updated_at: string;
};

/**
 * Load the user's conversation history from the database.
 * Returns recent messages and a summary of older conversations.
 */
export async function loadCoachMemory(userId: string): Promise<{
    recentMessages: StoredMessage[];
    historySummary: string | null;
}> {
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
        .from("coach_conversations")
        .select("messages, summary")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        // No previous conversation exists
        return { recentMessages: [], historySummary: null };
    }

    const record = data as { messages: StoredMessage[]; summary: string | null };

    // Return the most recent messages and any existing summary
    return {
        recentMessages: record.messages.slice(-MAX_RECENT_MESSAGES),
        historySummary: record.summary,
    };
}

/**
 * Save messages to the user's conversation history.
 * If history is too long, older messages are summarized.
 */
export async function saveCoachMemory(
    userId: string,
    newMessages: StoredMessage[]
): Promise<void> {
    console.log("[CoachMemory] saveCoachMemory called for user:", userId, "with", newMessages.length, "messages");

    const supabase = supabaseAdmin();

    // First, load existing conversation
    const { data: existing, error: loadError } = await supabase
        .from("coach_conversations")
        .select("id, messages, summary")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

    if (loadError && loadError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine for new users
        console.log("[CoachMemory] Load error (may be normal for new users):", loadError);
    }

    let allMessages: StoredMessage[] = [];
    let existingSummary: string | null = null;
    let recordId: string | null = null;

    if (existing) {
        const record = existing as ConversationRecord;
        allMessages = [...(record.messages || []), ...newMessages];
        existingSummary = record.summary;
        recordId = record.id;
        console.log("[CoachMemory] Found existing record:", recordId, "with", record.messages?.length || 0, "messages");
    } else {
        allMessages = newMessages;
        console.log("[CoachMemory] No existing record, will create new");
    }

    // If we have too many messages, compact older ones into summary
    let summary = existingSummary;
    let messagesToKeep = allMessages;

    if (allMessages.length > MAX_RECENT_MESSAGES * 2) {
        // Take older messages to summarize
        const olderMessages = allMessages.slice(0, -MAX_RECENT_MESSAGES);
        messagesToKeep = allMessages.slice(-MAX_RECENT_MESSAGES);

        // Create compact summary of older messages
        const compactedOld = compactMessages(olderMessages);

        // Append to existing summary
        if (existingSummary) {
            summary = truncateSummary(`${existingSummary}\n\n${compactedOld}`);
        } else {
            summary = truncateSummary(compactedOld);
        }
        console.log("[CoachMemory] Compacted", olderMessages.length, "old messages");
    }

    // Upsert the conversation
    if (recordId) {
        console.log("[CoachMemory] Updating existing record:", recordId);
        const { error: updateError } = await supabase
            .from("coach_conversations")
            .update({
                messages: messagesToKeep,
                summary: summary,
                updated_at: new Date().toISOString(),
            })
            .eq("id", recordId);

        if (updateError) {
            console.error("[CoachMemory] UPDATE ERROR:", updateError);
            throw updateError;
        }
        console.log("[CoachMemory] Update successful");
    } else {
        console.log("[CoachMemory] Inserting new record for user:", userId);
        const { error: insertError } = await supabase
            .from("coach_conversations")
            .insert({
                user_id: userId,
                messages: messagesToKeep,
                summary: summary,
            });

        if (insertError) {
            console.error("[CoachMemory] INSERT ERROR:", insertError);
            throw insertError;
        }
        console.log("[CoachMemory] Insert successful");
    }
}

/**
 * Compact a list of messages into a brief summary
 */
function compactMessages(messages: StoredMessage[]): string {
    if (messages.length === 0) return "";

    // Extract key themes from the conversation
    const userMessages = messages
        .filter(m => m.role === "user")
        .map(m => m.content.slice(0, 100))
        .join("; ");

    const assistantInsights = messages
        .filter(m => m.role === "assistant")
        .map(m => {
            // Extract just the first sentence or key point
            const firstSentence = m.content.split(/[.!?]/)[0];
            return firstSentence?.slice(0, 80) || "";
        })
        .filter(Boolean)
        .slice(-5) // Keep last 5 insights
        .join("; ");

    const dateRange = getDateRange(messages);

    return `[Conversación ${dateRange}] El usuario habló sobre: ${userMessages.slice(0, 300)}. Insights dados: ${assistantInsights.slice(0, 400)}.`;
}

/**
 * Truncate summary to max length, keeping complete sentences
 */
function truncateSummary(summary: string): string {
    if (summary.length <= MAX_SUMMARY_LENGTH) return summary;

    // Cut at last complete sentence before limit
    const truncated = summary.slice(0, MAX_SUMMARY_LENGTH);
    const lastPeriod = truncated.lastIndexOf(".");

    return lastPeriod > MAX_SUMMARY_LENGTH / 2
        ? truncated.slice(0, lastPeriod + 1)
        : truncated + "...";
}

/**
 * Get date range string from messages
 */
function getDateRange(messages: StoredMessage[]): string {
    if (messages.length === 0) return "sin fecha";

    const dates = messages
        .map(m => m.timestamp)
        .filter(Boolean)
        .map(t => new Date(t));

    if (dates.length === 0) return "reciente";

    const first = dates[0];
    const last = dates[dates.length - 1];

    const formatDate = (d: Date) => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });

    if (first.toDateString() === last.toDateString()) {
        return formatDate(first);
    }

    return `${formatDate(first)} - ${formatDate(last)}`;
}

/**
 * Build context prompt from memory for the AI
 */
export function buildMemoryContext(
    recentMessages: StoredMessage[],
    historySummary: string | null
): string {
    let context = "";

    if (historySummary) {
        context += `[HISTORIAL PREVIO - Resumen de conversaciones anteriores]\n${historySummary}\n\n`;
    }

    if (recentMessages.length > 0) {
        context += "[MENSAJES RECIENTES de esta conversación ya están en el historial del chat]\n";
    }

    return context;
}
