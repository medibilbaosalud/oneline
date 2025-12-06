
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as Blob;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');

        // Robust fallback chain requested by product:
        // 1) Gemini 2.5 Flash Live
        // 2) Gemini 2.5 Flash Native Audio (Preview)
        // 3) Gemini 2.0 Flash Live
        const modelsToTry = [
            { model: 'gemini-2.5-flash-live', label: 'Gemini 2.5 Flash Live' },
            { model: 'gemini-2.5-flash-native-audio-preview', label: 'Gemini 2.5 Flash Native Audio (Preview)' },
            { model: 'gemini-2.0-flash-live', label: 'Gemini 2.0 Flash Live' }
        ];
        for (const { model: modelName, label } of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([
                    {
                        inlineData: {
                            mimeType: audioFile.type || 'audio/webm',
                            data: base64Audio
                        }
                    },
                    { text: "Transcribe this audio exactly as spoken. Do not add any commentary. Return only the text." }
                ]);

                const text = result.response.text();
                if (!text) throw new Error('Empty response');

                return NextResponse.json({ text, modelUsed: label });
            } catch (error: any) {
                console.warn(`Model ${modelName} failed:`, error?.message ?? error);
                // Continue to next model
            }
        }

        // If we get here, all models failed
        console.error('All transcription models failed');
        return NextResponse.json(
            { error: "Voice dictation is busy right now. Please try again in a few moments." },
            { status: 503 }
        );

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: "We could not process your audio. Please check your connection and try again." },
            { status: 500 }
        );
    }
}
