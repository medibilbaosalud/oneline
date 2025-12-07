// src/app/api/image-test/route.ts
// Test endpoint for HuggingFace image generation

import { NextRequest, NextResponse } from "next/server";
import { generateImageSDXL } from "@/lib/hfImage";

export const runtime = "nodejs";
// We allow a longer duration because image generation can be slow (30s+ for cold starts).
export const maxDuration = 120; // Allow up to 2 minutes for image generation

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const prompt = body?.prompt;

        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Missing or invalid 'prompt'" },
                { status: 400 }
            );
        }

        console.log(`[API/IMAGE-TEST] Generating image for prompt: "${prompt.slice(0, 100)}..."`);

        const base64 = await generateImageSDXL(prompt.trim());

        if (!base64) {
            return NextResponse.json(
                { error: "Image generation failed. Check server logs." },
                { status: 500 }
            );
        }

        // Convert base64 to buffer and return as PNG
        const imageBuffer = Buffer.from(base64, "base64");

        return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("[API/IMAGE-TEST] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
