// src/lib/groqClient.ts
import Groq from "groq-sdk";

// Model priority cascade - ordered by preference
// llama-3.1-8b-instant: 14.4K req/day - high volume, fast
// llama-3.3-70b-versatile: 1K req/day - best quality
// llama-4-maverick: 1K req/day - good middle ground
const MODEL_CASCADE = [
    "llama-3.1-8b-instant",      // Primary: high volume (14.4K/day)
    "llama-3.3-70b-versatile",   // Fallback: best quality (1K/day)
    "meta-llama/llama-4-maverick-17b-128e-instruct", // Last resort
] as const;

type GroqMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

type ChatResult = {
    reply: string;
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
 * Chat with Groq using a cascade of models.
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

    for (const model of MODEL_CASCADE) {
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
            console.warn(`[Groq] Model ${model} failed:`, errorMessage);
            errors.push({ model, error: errorMessage });

            // Check if it's a rate limit error - if so, try next model
            const isRateLimit = errorMessage.toLowerCase().includes("rate") ||
                errorMessage.toLowerCase().includes("limit") ||
                errorMessage.toLowerCase().includes("429");

            if (!isRateLimit && !errorMessage.toLowerCase().includes("model")) {
                // If it's not a rate limit or model error, it might be a real problem
                // Still try next model but log it
                console.error(`[Groq] Non-rate-limit error for ${model}:`, errorMessage);
            }
        }
    }

    // All models failed
    console.error("[Groq] All models failed:", errors);
    throw new Error("All Groq models are unavailable. Please try again later.");
}

export type { GroqMessage, ChatResult };
