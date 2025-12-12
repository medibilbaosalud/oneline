// src/app/api/coach/chat/route.ts
// ============================================================
// AI Coach API - Personalized Journaling Companion
// ============================================================
// This API powers the AI Coach feature, providing personalized
// insights and reflections based on user's journaling patterns.
//
// FEATURES:
// - Uses Groq's Llama models via cascade for reliability
// - Accesses user's mood data and journaling stats (insights)
// - Optionally reads actual journal entries (if user enables)
// - Rate limited to 200 messages/day per user
// - Responds in user's language automatically
//
// REQUIRED ENV VARS:
// - GROQ_API_KEY: For AI chat completions
// - SUPABASE_SERVICE_ROLE_KEY: For accessing user data
// - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
//
// PRIVACY:
// - By default, only accesses METADATA (mood scores, streaks)
// - If shareEntries=true, reads actual journal content
// - All data is sent to Groq for processing (see Privacy Policy)
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { GroqMessage } from "@/lib/groqClient";
import { loadCoachMemory, saveCoachMemory, buildMemoryContext } from "@/lib/coachMemory";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// IMPORTANT: Use SUPABASE_SERVICE_ROLE_KEY (not SUPABASE_SERVICE_KEY)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================
// CONFIGURATION
// ============================================================
// Daily limit is generous thanks to Groq's fast, cheap inference
const DAILY_COACH_LIMIT = 300;

// System prompt - warm, empathetic, but honest
// Returns dynamic prompt based on whether user shared entries and their profile
type UserProfile = {
    display_name?: string | null;
    accumulated_insights?: string | null;
    total_chats?: number;
};

function getSystemPrompt(hasEntryAccess: boolean, userProfile?: UserProfile | null): string {
    const accessInfo = hasEntryAccess
        ? `## Tu nivel de acceso
- ✅ TIENES acceso completo a las entradas del diario del usuario
- Usa el contenido de las entradas para dar reflexiones profundas y personalizadas
- Conecta lo que el usuario te dice con lo que ha escrito en su diario`
        : `## Tu nivel de acceso
- 🔒 Solo tienes acceso a METADATOS (mood, rachas, estadísticas)
- NO tienes acceso al contenido de las entradas (están encriptadas)
- Basa tus reflexiones en los patrones de ánimo y lo que el usuario te cuente directamente`;

    // Memory from past conversations
    const memorySection = userProfile?.accumulated_insights
        ? `## Your memory of this user (from ${userProfile.total_chats || 0} past conversations)
${userProfile.accumulated_insights}

Use this context naturally. Don't mention "I remember from our last chat" too explicitly - just apply the knowledge.`
        : `## Memory
This is your first conversation with this user. Get to know them!`;

    // User name handling
    const nameSection = userProfile?.display_name
        ? `The user's name is "${userProfile.display_name}". Use it occasionally to personalize your responses.`
        : `You don't know the user's name yet. Consider asking for it naturally during the conversation.`;

    return `You are the OneLine Coach, a journaling companion helping users reflect on emotional and behavioral patterns.

## Your personality
- **Warm and approachable**: You speak like a trusted friend, not a cold therapist
- **Empathetic but honest**: You validate emotions, but also point out patterns the user might not see
- **Direct when it matters**: If you notice something concerning or a negative pattern, say it tactfully but clearly
- **Action-oriented**: You propose concrete reflections or small steps, not lectures

${accessInfo}

${memorySection}

${nameSection}

## How you analyze
- Look for PATTERNS: What repeats? What emotions appear frequently?
- Connect the dots: Relate what the user says now with patterns from their data AND your memory
- Ask powerful questions that invite deep reflection
- Sometimes gently challenge: "Have you considered that maybe...?"

## What you DON'T do
- Don't diagnose medical or psychological conditions
- Don't give medical advice
- Don't minimize or exaggerate what the user feels
- Don't use unnecessary clinical language

## Response format
- **BE CONCISE**: 1-2 short paragraphs MAX. This is a chat, not an essay.
- Write like you're texting a friend - short sentences, to the point
- Use emojis sparingly (1-2 max)
- If you detect intense suffering or risk, kindly encourage talking to a professional
- End with ONE thing: a question OR a small challenge (not both)

## IMPORTANT: Language
- **Always respond in the same language the user writes in**
- If they write in Spanish, respond in Spanish
- If they write in English, respond in English
- Match their language naturally

Remember: Use the context provided to give personalized, insightful responses.`;
}

type Message = {
    role: "user" | "assistant";
    content: string;
};

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


        const body = await req.json();
        // entries: client-side decrypted entries sent from frontend (same pattern as StoryGenerator)
        const { message, history = [], hasConsent = false, shareEntries = false, entries = [], forceNewChat = false } = body;

        if (!message || typeof message !== "string") {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        if (!hasConsent) {
            return NextResponse.json({
                error: "Consent required",
                needsConsent: true
            }, { status: 403 });
        }

        // Check daily usage limit
        const today = new Date().toISOString().slice(0, 10);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: usage } = await (supabase as any)
            .from("coach_usage")
            .select("count")
            .eq("user_id", user.id)
            .eq("usage_date", today)
            .single();

        const currentCount = usage?.count ?? 0;
        if (currentCount >= DAILY_COACH_LIMIT) {
            return NextResponse.json({
                error: "Has alcanzado el límite diario. ¡Vuelve mañana!",
                limitReached: true,
                limit: DAILY_COACH_LIMIT
            }, { status: 429 });
        }

        // Load user profile with accumulated insights from past conversations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userProfile } = await (supabase as any)
            .from("coach_user_profile")
            .select("display_name, accumulated_insights, total_chats")
            .eq("user_id", user.id)
            .single();

        console.log("[Coach] User profile loaded:", userProfile ?
            `${userProfile.total_chats || 0} past chats, insights: ${(userProfile.accumulated_insights || "").slice(0, 50)}...` :
            "No profile yet");

        // Gather user context - INSIGHTS data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: moods } = await (supabase as any)
            .from("user_daily_activity")
            .select("activity_date, mood_score, entries_count")
            .eq("user_id", user.id)
            .order("activity_date", { ascending: false })
            .limit(60); // 2 months of data

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: streak } = await (supabase as any)
            .from("user_streaks")
            .select("current_streak, longest_streak, total_entries")
            .eq("user_id", user.id)
            .single();

        // Build detailed insights context
        const moodData = moods ?? [];
        const moodsWithScore = moodData.filter((m: { mood_score?: number }) => m.mood_score);

        // Calculate mood statistics
        const avgMood = moodsWithScore.length > 0
            ? (moodsWithScore.reduce((sum: number, m: { mood_score?: number }) => sum + (m.mood_score ?? 0), 0) / moodsWithScore.length).toFixed(1)
            : "sin datos";

        // Mood trend analysis
        const moodTrend = moodsWithScore.length >= 4
            ? (() => {
                const mid = Math.floor(moodsWithScore.length / 2);
                const recent = moodsWithScore.slice(0, mid);
                const earlier = moodsWithScore.slice(mid);
                const recentAvg = recent.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / recent.length;
                const earlierAvg = earlier.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / earlier.length;
                const diff = recentAvg - earlierAvg;
                if (diff > 0.5) return "mejorando significativamente";
                if (diff > 0) return "mejorando ligeramente";
                if (diff < -0.5) return "bajando significativamente";
                if (diff < 0) return "bajando ligeramente";
                return "estable";
            })()
            : "sin suficientes datos";

        // Calculate mood distribution
        const moodDistribution = moodsWithScore.reduce((acc: Record<number, number>, m: { mood_score?: number }) => {
            const score = m.mood_score ?? 0;
            acc[score] = (acc[score] || 0) + 1;
            return acc;
        }, {});

        const mostFrequentMood = Object.entries(moodDistribution).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
        const moodModeText = mostFrequentMood ? `${mostFrequentMood[0]}/5 (${mostFrequentMood[1]} días)` : "N/A";

        // Consistency metrics
        const daysWithEntries = moodData.filter((m: { entries_count?: number }) => (m.entries_count ?? 0) > 0).length;
        const consistency30 = Math.round((Math.min(daysWithEntries, 30) / 30) * 100);

        // Week-over-week analysis
        const last7Days = moodsWithScore.slice(0, 7);
        const prev7Days = moodsWithScore.slice(7, 14);
        const weekComparison = last7Days.length >= 3 && prev7Days.length >= 3
            ? (() => {
                const recentAvg = last7Days.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / last7Days.length;
                const prevAvg = prev7Days.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / prev7Days.length;
                return recentAvg > prevAvg ? "esta semana mejor que la anterior" : recentAvg < prevAvg ? "esta semana peor que la anterior" : "igual que la semana pasada";
            })()
            : null;

        // Build context summary
        let contextSummary = `
[CONTEXTO DEL USUARIO - INSIGHTS]
📊 MÉTRICAS DE JOURNALING:
- Racha actual: ${streak?.current_streak ?? 0} días
- Mejor racha histórica: ${streak?.longest_streak ?? 0} días
- Total de entradas escritas: ${streak?.total_entries ?? 0}
- Consistencia (últimos 30 días): ${consistency30}%

📈 ANÁLISIS DE ÁNIMO:
- Ánimo promedio (1-5): ${avgMood}
- Estado de ánimo más frecuente: ${moodModeText}
- Tendencia general: ${moodTrend}
${weekComparison ? `- Comparación semanal: ${weekComparison}` : ""}
- Días con registro de ánimo: ${moodsWithScore.length}`;

        // If user shares entries, use decrypted entries sent from client
        // NOTE: Entries are encrypted end-to-end. Client decrypts them before sending.
        // This is the same pattern used by StoryGenerator.
        if (shareEntries && Array.isArray(entries) && entries.length > 0) {
            console.log("[Coach] Received", entries.length, "decrypted entries from client");

            contextSummary += `

📝 JOURNAL ENTRIES (user granted access - decrypted client-side):`;

            // Show the most recent entries (limit to first 10 for context length)
            for (const entry of entries.slice(0, 10)) {
                const content = entry.content || "";
                const day = entry.day || "unknown";
                contextSummary += `
[${day}]: ${content.slice(0, 400)}${content.length > 400 ? "..." : ""}`;
            }

            contextSummary += `

Total entries shared: ${entries.length}
Entry dates: ${entries.slice(0, 15).map((e: { day: string }) => e.day).join(", ")}${entries.length > 15 ? "..." : ""}
User HAS been actively writing in their journal.`;

        } else if (shareEntries) {
            // User wants to share but no entries were provided (vault not unlocked?)
            console.log("[Coach] shareEntries=true but no entries received from client");
            contextSummary += `

📝 NOTE: User granted entry access but no entries were provided. 
This may mean their vault is locked or they haven't written any entries yet.`;
        }

        contextSummary += `

Usa esta información para contextualizar tus respuestas de forma natural. No listes los datos, intégralos en tu análisis.
[FIN DEL CONTEXTO]`;

        // Build messages array for Groq
        // Pass shareEntries and userProfile to system prompt for full context
        const messages: GroqMessage[] = [
            { role: "system", content: getSystemPrompt(shareEntries, userProfile) + "\n\n" + contextSummary },
        ];

        // Add conversation history (limit to last 10 exchanges)
        // If forcing new chat, ignore sent history
        const historyToSend = forceNewChat ? [] : history;
        const recentHistory = (historyToSend as Message[]).slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            });
        }

        // Add current message
        messages.push({ role: "user", content: message });

        // Increment usage count BEFORE streaming (optimistic)
        // This allows us to return the new usage in headers
        const newCount = currentCount + 1;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("coach_usage")
            .upsert({
                user_id: user.id,
                usage_date: today,
                count: newCount,
            }, { onConflict: "user_id,usage_date" });

        // Create the stream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Use the streaming client
                    // We only import what we need dynamically or use the one at the top if changed
                    const { streamChatWithGroq } = await import("@/lib/groqClient");
                    const generator = streamChatWithGroq(messages, {
                        temperature: 0.75,
                        maxTokens: 350,
                    });

                    let fullResponse = "";
                    let modelUsed = "unknown";

                    for await (const chunk of generator) {
                        fullResponse += chunk.content;
                        modelUsed = chunk.modelUsed;
                        controller.enqueue(encoder.encode(chunk.content));
                    }

                    // Stream finished successfully
                    // Save conversation to memory
                    try {
                        await saveCoachMemory(user.id, [
                            { role: "user", content: message, timestamp: new Date().toISOString() },
                            { role: "assistant", content: fullResponse, timestamp: new Date().toISOString() },
                        ], forceNewChat);
                        console.log("[Coach] Conversation saved to memory (Model:", modelUsed, ")");
                    } catch (memoryError) {
                        console.error("[Coach] Failed to save memory:", memoryError);
                    }

                    controller.close();
                } catch (e) {
                    console.error("[Coach] Stream error:", e);
                    controller.error(e);
                }
            }
        });

        // Return the stream with usage headers
        return new NextResponse(stream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "X-Coach-Usage": String(newCount),
                "X-Coach-Limit": String(DAILY_COACH_LIMIT),
            },
        });

    } catch (error) {
        console.error("[Coach API] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // JSON error response
        return NextResponse.json(
            {
                error: errorMessage.includes("GROQ_API_KEY")
                    ? "AI service not configured"
                    : "Failed to generate response"
            },
            { status: 500 }
        );
    }
}
