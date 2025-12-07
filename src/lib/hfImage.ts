// src/lib/hfImage.ts
// HuggingFace Stable Diffusion XL integration for image generation

import { HfInference } from "@huggingface/inference";

const HF_TOKEN = process.env.HF_TOKEN;
const MODEL = "stabilityai/stable-diffusion-xl-base-1.0";

// Timeout for image generation (SDXL can take 30-60 seconds)
// We set a generous timeout to prevent the request from hanging indefinitely if the model is cold.
const GENERATION_TIMEOUT_MS = 90000; // 90 seconds

/**
 * Generates an image using HuggingFace's Stable Diffusion XL model.
 * 
 * @param prompt - The text prompt describing the image to generate
 * @returns Base64-encoded PNG image data, or null if generation fails
 */
export async function generateImageSDXL(prompt: string): Promise<string | null> {
    if (!HF_TOKEN) {
        console.error("[HF_IMAGE] CRITICAL: HF_TOKEN is not set in environment variables");
        return null;
    }

    if (!prompt || prompt.trim().length === 0) {
        console.error("[HF_IMAGE] CRITICAL: prompt is empty");
        return null;
    }

    console.log(`[HF_IMAGE] Starting image generation with model: ${MODEL}`);
    console.log(`[HF_IMAGE] Prompt: "${prompt.slice(0, 150)}..."`);

    const hf = new HfInference(HF_TOKEN);

    try {
        // Create a timeout promise
        // This ensures we can reject the request if HuggingFace takes too long,
        // rather than waiting forever or relying on default fetch timeouts.
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Image generation timed out after ${GENERATION_TIMEOUT_MS / 1000}s`));
            }, GENERATION_TIMEOUT_MS);
        });

        // Create the generation promise
        const generationPromise = hf.textToImage({
            model: MODEL,
            inputs: prompt,
            parameters: {
                width: 768,
                height: 768,
                num_inference_steps: 25,
                guidance_scale: 6,
            },
        });

        // Race between generation and timeout
        const startTime = Date.now();
        const result = await Promise.race([generationPromise, timeoutPromise]);
        const elapsedMs = Date.now() - startTime;

        console.log(`[HF_IMAGE] Generation completed in ${(elapsedMs / 1000).toFixed(1)}s`);

        // Convert Blob to base64
        // The result can be a Blob, Uint8Array, or a stream depending on the response type.
        // We normalize it to a Buffer to easily convert to base64.
        let buffer: Buffer;

        if ((result as any) instanceof Blob) {
            const arrayBuffer = await (result as unknown as Blob).arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        } else if ((result as any) instanceof Uint8Array) {
            buffer = Buffer.from(result);
        } else {
            // Handle streaming response (unlikely but safe)
            const chunks: Uint8Array[] = [];
            for await (const chunk of result as AsyncIterable<Uint8Array>) {
                chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
        }

        if (buffer.length === 0) {
            console.error("[HF_IMAGE] Received empty buffer from HuggingFace");
            return null;
        }

        const base64 = buffer.toString("base64");
        console.log(`[HF_IMAGE] ✅ SUCCESS! Image generated, base64 length: ${base64.length}`);

        return base64;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[HF_IMAGE] ❌ FAILED: ${errorMessage}`);

        // Log specific error types for debugging
        if (errorMessage.includes("timed out")) {
            console.error("[HF_IMAGE] Hint: The model may be loading (cold start). Try again in 30 seconds.");
        } else if (errorMessage.includes("401") || errorMessage.includes("unauthorized")) {
            console.error("[HF_IMAGE] Hint: HF_TOKEN may be invalid or expired.");
        } else if (errorMessage.includes("429") || errorMessage.includes("rate")) {
            console.error("[HF_IMAGE] Hint: Rate limit exceeded. Wait before retrying.");
        } else if (errorMessage.includes("503") || errorMessage.includes("loading")) {
            console.error("[HF_IMAGE] Hint: Model is loading. This is normal for cold starts.");
        }

        return null;
    }
}
