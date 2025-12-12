// src/app/api/generate-story/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { generateStoryAudio, generateStoryImage, generateImagePrompt } from '@/lib/yearStory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabase = await supabaseServer();
    const {
        data: { user },
        error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
        return NextResponse.json({ error: 'sign-in required' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
        return NextResponse.json({ error: 'missing_body' }, { status: 400 });
    }

    const { story, storyId, options } = body;

    if (!story || typeof story !== 'string') {
        return NextResponse.json({ error: 'missing_story' }, { status: 400 });
    }

    // Generate Audio and Image in parallel
    // Flow: Story -> Image Prompt -> Image

    let imageBase64: string | null = null;
    let audioBase64: string | null = null;
    let audioMimeType: string | null = null;

    const includeImage = options?.includeImage !== false;
    const includeAudio = options?.includeAudio !== false;

    try {
        const tasks = [];

        // 1. Audio
        if (includeAudio) {
            tasks.push(generateStoryAudio(story));
        } else {
            tasks.push(Promise.resolve(null));
        }

        // 2. Image (needs prompt first)
        if (includeImage) {
            // Async wrapper to chain prompt -> image
            const imageTask = async () => {
                const prompt = await generateImagePrompt(story);
                return generateStoryImage(prompt);
            };
            tasks.push(imageTask());
        } else {
            tasks.push(Promise.resolve(null));
        }

        const results = await Promise.allSettled(tasks);
        const audioResult = results[0];
        const imageResult = results[1];

        if (includeAudio && audioResult.status === 'fulfilled' && audioResult.value) {
            const val = audioResult.value as any;
            audioBase64 = val.data;
            audioMimeType = val.mimeType;
        }

        if (includeImage && imageResult.status === 'fulfilled' && imageResult.value) {
            imageBase64 = imageResult.value as string;
        }

    } catch (e) {
        console.error("Error generating assets:", e);
        // Don't fail completely, return what we have
    }

    return NextResponse.json(
        {
            audioBase64,
            audioMimeType,
            imageBase64,
        },
        { headers: { 'cache-control': 'no-store' } },
    );
}
