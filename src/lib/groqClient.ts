// src/lib/groqClient.ts
import Groq from "groq-sdk";

// Model priority cascade - ordered by INTELLIGENCE (best first)
// llama-3.3-70b-versatile: Best quality, 70B params (1K req/day)
// llama-3.1-8b-instant: Fast, good quality (14.4K req/day)
// llama-4-maverick: Alternative with large context
const CHAT_MODEL_CASCADE = [
    "llama-3.3-70b-versatile",   // Primary: best intelligence
    "llama-3.1-8b-instant",      // Fallback: high volume
    "meta-llama/llama-4-maverick-17b-128e-instruct", // Last resort
] as const;

// Whisper model cascade for transcription
// whisper-large-v3-turbo: Faster, same quality
// whisper-large-v3: Fallback
const WHISPER_MODEL_CASCADE = [
    "whisper-large-v3-turbo",
    "whisper-large-v3",
] as const;

type GroqMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

type ChatResult = {
    reply: string;
    modelUsed: string;
};

type TranscriptionResult = {
    text: string;
    modelUsed: string;
};

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY environment variable is not configured");
        }
        groqClient = new Groq({ apiKey });
    }
    return groqClient;
}

/**
 * Chat with Groq using a cascade of models (best intelligence first).
 * Tries each model in order until one succeeds.
 */
export async function chatWithGroq(
    messages: GroqMessage[],
    options?: {
        temperature?: number;
        maxTokens?: number;
    }
): Promise<ChatResult> {
    const client = getGroqClient();
    const errors: { model: string; error: string }[] = [];

    for (const model of CHAT_MODEL_CASCADE) {
        try {
            const response = await client.chat.completions.create({
                model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 1024,
            });

            const reply = response.choices[0]?.message?.content;
            if (!reply) {
                throw new Error("Empty response from model");
            }

            return { reply, modelUsed: model };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[Groq Chat] Model ${model} failed:`, errorMessage);
            errors.push({ model, error: errorMessage });
        }
    }

    console.error("[Groq Chat] All models failed:", errors);
    throw new Error("All Groq models are unavailable. Please try again later.");
}

/**
 * Transcribe audio using Groq's Whisper models.
 * Cascade: whisper-large-v3-turbo → whisper-large-v3
 */
export async function transcribeWithGroq(
    audioFile: File | Blob,
    options?: {
        language?: string;
        prompt?: string;
    }
): Promise<TranscriptionResult> {
    const client = getGroqClient();
    const errors: { model: string; error: string }[] = [];

    for (const model of WHISPER_MODEL_CASCADE) {
        try {
            const response = await client.audio.transcriptions.create({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                file: audioFile as any,
                model,
                language: options?.language,
                prompt: options?.prompt,
            });

            return { text: response.text, modelUsed: model };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[Groq Whisper] Model ${model} failed:`, errorMessage);
            errors.push({ model, error: errorMessage });
        }
    }

    console.error("[Groq Whisper] All models failed:", errors);
    throw new Error("Transcription service unavailable. Please try again.");
}

export type { GroqMessage, ChatResult, TranscriptionResult };
