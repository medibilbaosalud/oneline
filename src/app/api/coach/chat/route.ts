// src/app/api/coach/chat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chatWithGroq, type GroqMessage } from "@/lib/groqClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Daily limit per user - generous thanks to Groq
const DAILY_COACH_LIMIT = 200;

// System prompt - warm, empathetic, but honest
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

Remember: Use the context provided to give personalized, insightful responses.`;

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
        const { message, history = [], hasConsent = false, shareEntries = false } = body;

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

        // If user shares entries, fetch recent entries content
        if (shareEntries) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: entries } = await (supabase as any)
                .from("journal_entries")
                .select("day, content, starred")
                .eq("user_id", user.id)
                .order("day", { ascending: false })
                .limit(10);

            if (entries && entries.length > 0) {
                contextSummary += `

📝 ÚLTIMAS ENTRADAS DEL DIARIO (el usuario te ha dado acceso):`;
                for (const entry of entries) {
                    const star = entry.starred ? "⭐ " : "";
                    // Entries might be encrypted - only include if they look like readable text
                    const content = entry.content || "";
                    if (content && !content.startsWith("U2F") && content.length < 2000) {
                        contextSummary += `
${star}[${entry.day}]: ${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`;
                    }
                }
            }
        }

        contextSummary += `

Usa esta información para contextualizar tus respuestas de forma natural. No listes los datos, intégralos en tu análisis.
[FIN DEL CONTEXTO]`;

        // Build messages array for Groq
        const messages: GroqMessage[] = [
            { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextSummary },
        ];

        // Add conversation history (limit to last 10 exchanges)
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
            maxTokens: 768, // Slightly more tokens for richer responses
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
