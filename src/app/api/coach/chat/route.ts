// src/app/api/coach/chat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

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
        const { message, history = [] } = body;

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        // Load user's recent journal entries for context
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data: entries } = await supabase
            .from("journal_entries")
            .select("entry_date, content_cipher, iv")
            .eq("user_id", user.id)
            .gte("entry_date", thirtyDaysAgo.slice(0, 10))
            .order("entry_date", { ascending: false })
            .limit(20);

        // Note: Entries are encrypted. The coach works on metadata and patterns.
        // For full content access, user would need to decrypt on client side.
        // For now, we'll use aggregate patterns.

        // Get mood history
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: moods } = await (supabase as any)
            .from("user_daily_activity")
            .select("activity_date, mood_score, entries_count")
            .eq("user_id", user.id)
            .gte("activity_date", thirtyDaysAgo.slice(0, 10))
            .order("activity_date", { ascending: false });

        // Get streak info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: streak } = await (supabase as any)
            .from("user_streaks")
            .select("current_streak, longest_streak, total_entries")
            .eq("user_id", user.id)
            .single();

        // Build context
        const entryCount = entries?.length ?? 0;
        const moodData = moods ?? [];
        const avgMood = moodData.length > 0
            ? moodData.reduce((sum: number, m: { mood_score?: number }) => sum + (m.mood_score ?? 0), 0) / moodData.filter((m: { mood_score?: number }) => m.mood_score).length
            : 0;

        const moodTrend = moodData.length >= 4
            ? (() => {
                const recent = moodData.slice(0, Math.floor(moodData.length / 2)).filter((m: { mood_score?: number }) => m.mood_score);
                const earlier = moodData.slice(Math.floor(moodData.length / 2)).filter((m: { mood_score?: number }) => m.mood_score);
                const recentAvg = recent.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / recent.length;
                const earlierAvg = earlier.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / earlier.length;
                return recentAvg > earlierAvg ? "improving" : recentAvg < earlierAvg ? "declining" : "stable";
            })()
            : "unknown";

        // Calculate writing consistency
        const daysWithEntries = new Set(entries?.map(e => e.entry_date)).size;
        const consistency = entryCount > 0 ? Math.round((daysWithEntries / 30) * 100) : 0;

        // Generate response with Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "AI not configured" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemContext = `You are a warm, insightful journaling coach for the OneLine app. 
You have access to the user's journaling patterns and mood data (but not their actual encrypted entries).

USER CONTEXT:
- Journal entries in last 30 days: ${entryCount}
- Current streak: ${streak?.current_streak ?? 0} days
- Longest streak ever: ${streak?.longest_streak ?? 0} days
- Total lifetime entries: ${streak?.total_entries ?? 0}
- Writing consistency: ${consistency}% of days
- Average mood (1-5 scale): ${avgMood > 0 ? avgMood.toFixed(1) : "Not tracked yet"}
- Mood trend: ${moodTrend}
- Days with mood tracking: ${moodData.filter((m: { mood_score?: number }) => m.mood_score).length}

GUIDELINES:
- Be warm, encouraging, and insightful
- Reference their actual data (streak, mood patterns, consistency)
- Offer actionable suggestions when appropriate
- Keep responses concise but meaningful (2-4 paragraphs max)
- Use emojis sparingly for warmth
- If they haven't journaled much, gently encourage them
- Never be preachy or condescending
- Acknowledge their efforts and progress`;

        const conversationHistory = history.map((msg: { role: string; content: string }) =>
            `${msg.role === 'user' ? 'User' : 'Coach'}: ${msg.content}`
        ).join('\n\n');

        const prompt = `${systemContext}

${conversationHistory ? `CONVERSATION SO FAR:\n${conversationHistory}\n\n` : ''}User: ${message}

Coach:`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        return NextResponse.json({ response });

    } catch (error) {
        console.error("[Coach API] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate response" },
            { status: 500 }
        );
    }
}
