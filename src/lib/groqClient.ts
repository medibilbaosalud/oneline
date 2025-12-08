// src/lib/groqClient.ts
// ============================================================
// Groq AI Client Library
// ============================================================
// This module provides a robust interface to Groq's AI APIs for:
// 1. Chat completions (AI Coach conversations)
// 2. Audio transcription (voice-to-text with Whisper)
//
// KEY FEATURES:
// - Model cascade: Tries multiple models in order of preference
// - Automatic fallback: If primary model hits rate limit, uses next
// - Singleton pattern: Reuses client across requests for efficiency
//
// REQUIRED ENV VARS:
// - GROQ_API_KEY: Your Groq API key from https://console.groq.com
//
// WHY GROQ?
// - Faster inference than OpenAI (LPU architecture)
// - Generous free tier for development
// - Same model quality (Llama, Whisper)
// ============================================================

import Groq from "groq-sdk";

// ============================================================
// MODEL CASCADE CONFIGURATION
// ============================================================
// Models are ordered by INTELLIGENCE/QUALITY (best first).
// When the first model fails (rate limit, error), we try the next.
//
// Chat Models:
// - llama-3.3-70b-versatile: Best quality, 70B parameters
//   → Rate limit: ~1K requests/day, use for complex queries
// - llama-3.1-8b-instant: Faster, smaller, still good
//   → Rate limit: ~14.4K requests/day, high volume
// - llama-4-maverick: Alternative with very large context window
//   → Good for long conversations
// ============================================================
const CHAT_MODEL_CASCADE = [
    "llama-3.3-70b-versatile",   // Primary: best intelligence
    "llama-3.1-8b-instant",      // Fallback: high volume
    "meta-llama/llama-4-maverick-17b-128e-instruct", // Last resort
] as const;

// ============================================================
// Whisper Models for Audio Transcription:
// - whisper-large-v3-turbo: Faster version, same accuracy
// - whisper-large-v3: Original, slightly slower
// Both support 100+ languages automatically
// ============================================================
const WHISPER_MODEL_CASCADE = [
    "whisper-large-v3-turbo",
    "whisper-large-v3",
] as const;

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Message format for Groq chat API */
type GroqMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

/** Result returned from chat completion */
type ChatResult = {
    reply: string;      // The AI's response text
    modelUsed: string;  // Which model actually generated the response
};

/** Result returned from audio transcription */
type TranscriptionResult = {
    text: string;       // The transcribed text
    modelUsed: string;  // Which Whisper model was used
};

// ============================================================
// SINGLETON CLIENT
// ============================================================
// We reuse the same client instance across requests to avoid
// recreating it on every API call (more efficient).
// ============================================================
let groqClient: Groq | null = null;

/**
 * Get or create the Groq client instance.
 * Throws if GROQ_API_KEY is not configured.
 */
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

// ============================================================
// CHAT FUNCTION
// ============================================================
/**
 * Send a chat message to Groq and get a response.
 * Uses model cascade for reliability.
 * 
 * @param messages - Array of conversation messages (system, user, assistant)
 * @param options - Optional configuration (temperature, maxTokens)
 * @returns Promise with the AI reply and which model was used
 * 
 * @example
 * const result = await chatWithGroq([
 *   { role: "system", content: "You are a helpful assistant" },
 *   { role: "user", content: "Hello!" }
 * ]);
 * console.log(result.reply); // "Hello! How can I help you?"
 */
export async function chatWithGroq(
    messages: GroqMessage[],
    options?: {
        temperature?: number;  // 0-1, higher = more creative
        maxTokens?: number;    // Max response length
    }
): Promise<ChatResult> {
    const client = getGroqClient();
    const errors: { model: string; error: string }[] = [];

    // Try each model in cascade order
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

            // Success! Return the reply and which model worked
            return { reply, modelUsed: model };
        } catch (error) {
            // Log and continue to next model
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn(`[Groq Chat] Model ${model} failed:`, errorMessage);
            errors.push({ model, error: errorMessage });
        }
    }

    // All models failed
    console.error("[Groq Chat] All models failed:", errors);
    throw new Error("All Groq models are unavailable. Please try again later.");
}

// ============================================================
// TRANSCRIPTION FUNCTION
// ============================================================
/**
 * Transcribe audio to text using Groq's Whisper models.
 * Supports 100+ languages with automatic detection.
 * 
 * @param audioFile - Audio file (Blob or File) to transcribe
 * @param options - Optional: language hint, context prompt
 * @returns Promise with transcribed text and model used
 * 
 * @example
 * const result = await transcribeWithGroq(audioBlob, { language: "es" });
 * console.log(result.text); // "Hola mundo"
 */
export async function transcribeWithGroq(
    audioFile: File | Blob,
    options?: {
        language?: string;  // ISO code: "es", "en", "fr", etc.
        prompt?: string;    // Context hint for better accuracy
    }
): Promise<TranscriptionResult> {
    const client = getGroqClient();
    const errors: { model: string; error: string }[] = [];

    // Try each Whisper model in cascade order
    for (const model of WHISPER_MODEL_CASCADE) {
        try {
            const response = await client.audio.transcriptions.create({
                // Cast needed due to SDK type mismatch with browser File/Blob
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

    // All Whisper models failed
    console.error("[Groq Whisper] All models failed:", errors);
    throw new Error("Transcription service unavailable. Please try again.");
}

// Export types for use in other modules
export type { GroqMessage, ChatResult, TranscriptionResult };
