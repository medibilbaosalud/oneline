// src/app/api/reflection/generate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export async function POST(req: Request) {
    try {
        // Get auth header
        const authHeader = req.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.replace("Bearer ", "");

        // Verify user
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get request body
        const body = await req.json();
        const { entryText, entryDate } = body;

        if (!entryText || !entryDate) {
            return NextResponse.json({ error: "Missing entryText or entryDate" }, { status: 400 });
        }

        // Generate reflection using Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "AI not configured" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are a thoughtful journaling companion. Based on this journal entry, provide:
1. A brief, personal insight (2-3 sentences) that reflects back what you noticed in their words - emotions, themes, or underlying feelings. Be warm and understanding, not clinical.
2. A thought-provoking question for them to consider today (1 sentence) that relates to their entry and encourages self-reflection.

Journal entry from ${entryDate}:
"${entryText}"

Respond in this exact JSON format:
{
  "insight": "Your insight here...",
  "question": "Your question here?"
}

Keep the tone warm, personal, and encouraging. Avoid generic advice. Reference specific things they mentioned.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON from response
        let reflection;
        try {
            // Extract JSON from potential markdown code blocks
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                reflection = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found in response");
            }
        } catch {
            // Fallback if parsing fails
            reflection = {
                insight: "I noticed thoughtfulness in your words today. There seems to be something on your mind worth exploring further.",
                question: "What felt most important to you today, and why?"
            };
        }

        // Store the reflection for this user/date (optional - for caching)
        await supabase
            .from("user_reflections")
            .upsert({
                user_id: user.id,
                entry_date: entryDate,
                insight: reflection.insight,
                question: reflection.question,
                generated_at: new Date().toISOString(),
            }, { onConflict: "user_id,entry_date" })
            .select();

        return NextResponse.json({
            success: true,
            reflection: {
                date: entryDate,
                insight: reflection.insight,
                question: reflection.question,
            }
        });

    } catch (error) {
        console.error("[Reflection API] Error:", error);
        return NextResponse.json(
            { error: "Failed to generate reflection" },
            { status: 500 }
        );
    }
}

// GET - Retrieve pending reflection
export async function GET(req: Request) {
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

        // Get yesterday's date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        // Check for pending reflection
        const { data: reflection } = await supabase
            .from("user_reflections")
            .select("*")
            .eq("user_id", user.id)
            .eq("entry_date", yesterdayStr)
            .is("viewed_at", null)
            .single();

        if (!reflection) {
            return NextResponse.json({ hasPending: false });
        }

        // Check if it's after 8pm local time (we'll use a simple heuristic)
        const now = new Date();
        const hour = now.getHours();
        if (hour < 20) {
            return NextResponse.json({ hasPending: false, waitUntil: "8pm" });
        }

        return NextResponse.json({
            hasPending: true,
            reflection: {
                date: reflection.entry_date,
                insight: reflection.insight,
                question: reflection.question,
            }
        });

    } catch (error) {
        console.error("[Reflection API] GET Error:", error);
        return NextResponse.json({ hasPending: false });
    }
}

// PATCH - Mark reflection as viewed
export async function PATCH(req: Request) {
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
        const { entryDate } = body;

        await supabase
            .from("user_reflections")
            .update({ viewed_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .eq("entry_date", entryDate);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Reflection API] PATCH Error:", error);
        return NextResponse.json({ error: "Failed to mark as viewed" }, { status: 500 });
    }
}
