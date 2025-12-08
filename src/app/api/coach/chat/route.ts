// src/app/api/coach/chat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Daily limit per user
const DAILY_COACH_LIMIT = 20;

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

        if (!message) {
            return NextResponse.json({ error: "Message required" }, { status: 400 });
        }

        // Check if user has given consent to read entries
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
                error: "Daily limit reached",
                limitReached: true,
                limit: DAILY_COACH_LIMIT
            }, { status: 429 });
        }

        // Get mood history (this is what we can read - not encrypted)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: moods } = await (supabase as any)
            .from("user_daily_activity")
            .select("activity_date, mood_score, entries_count")
            .eq("user_id", user.id)
            .order("activity_date", { ascending: false })
            .limit(30);

        // Get streak info
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: streak } = await (supabase as any)
            .from("user_streaks")
            .select("current_streak, longest_streak, total_entries")
            .eq("user_id", user.id)
            .single();

        // Get entry count (metadata only - no content)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: entryCount } = await supabase
            .from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("entry_date", thirtyDaysAgo.slice(0, 10));

        // Build context from non-encrypted data
        const moodData = moods ?? [];
        const moodsWithScore = moodData.filter((m: { mood_score?: number }) => m.mood_score);
        const avgMood = moodsWithScore.length > 0
            ? moodsWithScore.reduce((sum: number, m: { mood_score?: number }) => sum + (m.mood_score ?? 0), 0) / moodsWithScore.length
            : 0;

        const moodTrend = moodsWithScore.length >= 4
            ? (() => {
                const mid = Math.floor(moodsWithScore.length / 2);
                const recent = moodsWithScore.slice(0, mid);
                const earlier = moodsWithScore.slice(mid);
                const recentAvg = recent.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / recent.length;
                const earlierAvg = earlier.reduce((s: number, m: { mood_score?: number }) => s + (m.mood_score ?? 0), 0) / earlier.length;
                return recentAvg > earlierAvg ? "improving" : recentAvg < earlierAvg ? "declining" : "stable";
            })()
            : "unknown";

        const daysWithEntries = moodData.filter((m: { entries_count?: number }) => (m.entries_count ?? 0) > 0).length;
        const consistency = Math.round((daysWithEntries / 30) * 100);

        // Generate response with Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "AI not configured" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // Use gemini-1.5-flash (cheaper than pro, confirmed working)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemContext = `You are a warm, insightful journaling coach for the OneLine app.
You have access to the user's journaling patterns and mood data.
Note: Journal entries are encrypted for privacy, so you can only see metadata patterns.

USER CONTEXT:
- Entries in last 30 days: ${entryCount ?? 0}
- Current streak: ${streak?.current_streak ?? 0} days
- Longest streak: ${streak?.longest_streak ?? 0} days
- Total entries: ${streak?.total_entries ?? 0}
- Consistency: ${consistency}% of days
- Average mood (1-5): ${avgMood > 0 ? avgMood.toFixed(1) : "Not tracked"}
- Mood trend: ${moodTrend}
- Days with mood data: ${moodsWithScore.length}

GUIDELINES:
- Be warm, encouraging, and insightful
- Reference their actual data (streak, mood patterns)
- Keep responses concise (2-3 paragraphs max)
- Use emojis sparingly
- Gently encourage if they haven't journaled much
- Never be preachy`;

        const conversationHistory = history.map((msg: { role: string; content: string }) =>
            `${msg.role === 'user' ? 'User' : 'Coach'}: ${msg.content}`
        ).join('\n\n');

        const prompt = `${systemContext}

${conversationHistory ? `CONVERSATION:\n${conversationHistory}\n\n` : ''}User: ${message}

Coach:`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

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
            response,
            usage: {
                used: currentCount + 1,
                limit: DAILY_COACH_LIMIT,
            }
        });

    } catch (error) {
        console.error("[Coach API] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate response" },
            { status: 500 }
        );
    }
}
