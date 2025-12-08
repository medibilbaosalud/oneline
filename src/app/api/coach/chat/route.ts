// src/app/api/coach/chat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chatWithGroq, type GroqMessage } from "@/lib/groqClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Daily limit per user
const DAILY_COACH_LIMIT = 50; // Increased thanks to Groq's generous limits

// System prompt - warm, empathetic, but honest (English for better model performance)
const SYSTEM_PROMPT = `You are the OneLine Coach, a journaling companion helping users reflect on emotional and behavioral patterns.

## Your personality
- **Warm and approachable**: You speak like a trusted friend, not a cold therapist
- **Empathetic but honest**: You validate emotions, but also point out patterns the user might not see
- **Direct when it matters**: If you notice something concerning or a negative pattern, say it tactfully but clearly
- **Action-oriented**: You propose concrete reflections or small steps, not lectures

## How you analyze
- Look for PATTERNS: What repeats? What emotions appear frequently?
- Connect the dots: Relate what the user says now with patterns from their data
- Ask powerful questions that invite deep reflection
- Sometimes gently challenge: "Have you considered that maybe...?"

## What you DON'T do
- Don't diagnose medical or psychological conditions
- Don't give medical advice
- Don't minimize or exaggerate what the user feels
- Don't use unnecessary clinical language

## Response format
- Maximum 2-3 short paragraphs
- Use emojis sparingly (1-2 max)
- If you detect intense suffering or risk, kindly encourage talking to a professional or someone they trust
- End with something useful: a reflection, a question, or a small challenge

## IMPORTANT: Language
- **Always respond in the same language the user writes in**
- If they write in Spanish, respond in Spanish
- If they write in English, respond in English
- Match their language naturally

Remember: You have access to the user's PATTERNS (streak, writing frequency, mood trends), but NOT the actual content of their entries (they're encrypted). Use that pattern information to contextualize your responses.`;

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
        const { message, history = [], hasConsent = false } = body;

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

        // Gather user context (non-encrypted metadata only)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: moods } = await (supabase as any)
            .from("user_daily_activity")
            .select("activity_date, mood_score, entries_count")
            .eq("user_id", user.id)
            .order("activity_date", { ascending: false })
            .limit(30);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: streak } = await (supabase as any)
            .from("user_streaks")
            .select("current_streak, longest_streak, total_entries")
            .eq("user_id", user.id)
            .single();

        // Build context summary
        const moodData = moods ?? [];
        const moodsWithScore = moodData.filter((m: { mood_score?: number }) => m.mood_score);
        const avgMood = moodsWithScore.length > 0
            ? (moodsWithScore.reduce((sum: number, m: { mood_score?: number }) => sum + (m.mood_score ?? 0), 0) / moodsWithScore.length).toFixed(1)
            : "sin datos";

        const moodTrend = moodsWithScore.length >= 4
            ? (() => {
                const mid = Math.floor(moodsWithScore.length / 2);
                const recent = moodsWithScore.slice(0, mid);
                const earlier = moodsWithScore.slice(mid);
                const recentAvg = recent.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / recent.length;
                const earlierAvg = earlier.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / earlier.length;
                return recentAvg > earlierAvg ? "mejorando" : recentAvg < earlierAvg ? "bajando" : "estable";
            })()
            : "sin suficientes datos";

        const daysWithEntries = moodData.filter((m: { entries_count?: number }) => (m.entries_count ?? 0) > 0).length;
        const consistency = Math.round((daysWithEntries / 30) * 100);

        // Context injection for the AI
        const contextSummary = `
[CONTEXTO DEL USUARIO - Solo tú ves esto, no lo menciones literalmente]
- Racha actual: ${streak?.current_streak ?? 0} días
- Mejor racha: ${streak?.longest_streak ?? 0} días  
- Entradas totales: ${streak?.total_entries ?? 0}
- Consistencia (últimos 30 días): ${consistency}%
- Ánimo promedio (1-5): ${avgMood}
- Tendencia de ánimo: ${moodTrend}
- Días con registro de ánimo: ${moodsWithScore.length}

Usa esta información para contextualizar tus respuestas, pero de forma natural, sin listar datos.
[FIN DEL CONTEXTO]`;

        // Build messages array for Groq
        const messages: GroqMessage[] = [
            { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextSummary },
        ];

        // Add conversation history (limit to last 10 exchanges to control context)
        const recentHistory = (history as Message[]).slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            });
        }

        // Add current message
        messages.push({ role: "user", content: message });

        // Call Groq with cascade
        const { reply, modelUsed } = await chatWithGroq(messages, {
            temperature: 0.75,
            maxTokens: 512,
        });

        // Increment usage count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from("coach_usage")
            .upsert({
                user_id: user.id,
                usage_date: today,
                count: currentCount + 1,
            }, { onConflict: "user_id,usage_date" });

        return NextResponse.json({
            response: reply,
            modelUsed,
            usage: {
                used: currentCount + 1,
                limit: DAILY_COACH_LIMIT,
            }
        });

    } catch (error) {
        console.error("[Coach API] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Don't expose internal errors to client
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
