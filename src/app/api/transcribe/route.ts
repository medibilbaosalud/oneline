// src/app/api/transcribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { transcribeWithGroq } from "@/lib/groqClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        // Verify auth
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

        // Get form data with audio file
        const formData = await req.formData();
        const audioFile = formData.get("audio") as File | null;
        const language = formData.get("language") as string | null;

        if (!audioFile) {
            return NextResponse.json({ error: "Audio file required" }, { status: 400 });
        }

        // Check file size (max 25MB for Groq)
        if (audioFile.size > 25 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
        }

        // Transcribe with Groq Whisper cascade
        const { text, modelUsed } = await transcribeWithGroq(audioFile, {
            language: language ?? undefined,
            prompt: "Transcription of a personal journal entry or reflection.",
        });

        return NextResponse.json({
            text,
            modelUsed,
        });

    } catch (error) {
        console.error("[Transcribe API] Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            {
                error: errorMessage.includes("GROQ_API_KEY")
                    ? "Transcription service not configured"
                    : "Failed to transcribe audio"
            },
            { status: 500 }
        );
    }
}
